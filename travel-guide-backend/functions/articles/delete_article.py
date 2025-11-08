import os, json, boto3

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])
BUCKET = os.environ["BUCKET_NAME"]

def _resp(status, body=None):
    return {
        "statusCode": status,
        "headers": {"Access-Control-Allow-Origin":"*"},
        "body": "" if body is None else json.dumps(body, ensure_ascii=False),
    }

def lambda_handler(event, context):
    article_id = (event.get("pathParameters") or {}).get("id")
    if not article_id:
        return _resp(400, {"error":"missing id"})

    # Lấy item để biết imageKey
    res = table.get_item(Key={"articleId": article_id})
    item = res.get("Item")
    if not item:
        return _resp(404, {"error":"not found"})

    # Xóa DynamoDB
    table.delete_item(Key={"articleId": article_id})

    # Xóa ảnh (nếu có)
    if "imageKey" in item and item["imageKey"]:
        try:
            s3.delete_object(Bucket=BUCKET, Key=item["imageKey"])
        except Exception:
            # Không fail nếu xóa ảnh lỗi
            pass

    return _resp(204)
