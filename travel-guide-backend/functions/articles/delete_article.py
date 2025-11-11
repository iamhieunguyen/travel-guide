import os
import json
import boto3
from cors import ok, error, options

dynamodb = boto3.resource("dynamodb")

TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]
table = dynamodb.Table(TABLE_NAME)

def _response(status, body_dict):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body_dict, ensure_ascii=False),
    }

def lambda_handler(event, context):
    method = (event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method"))
    if method == "OPTIONS":
        return options()
    try:
        path_params = event.get("pathParameters") or {}
        article_id = path_params.get("articleId")

        if not article_id:
            return _response(400, {"error": "articleId is required"})

        # Lấy item để xóa ảnh nếu có
        response = table.get_item(Key={'articleId': article_id})
        if 'Item' not in response:
            return _response(404, {"error": "Article not found"})

        item = response['Item']
        image_key = item.get('imageKey')

        # Xóa item trong DB
        table.delete_item(Key={'articleId': article_id})

        # Xóa ảnh khỏi S3 nếu có
        if image_key:
            import boto3
            s3 = boto3.client('s3')
            s3.delete_object(Bucket=BUCKET_NAME, Key=image_key)

        return _response(200, {"message": "Article deleted successfully"})

    except Exception as e:
        print(f"Error in delete_article: {e}")
        return _response(500, {"error": f"internal error: {e}"})