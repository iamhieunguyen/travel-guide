import os
import json
import boto3
from decimal import Decimal
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

        response = table.get_item(Key={'articleId': article_id})

        if 'Item' not in response:
            return _response(404, {"error": "Article not found"})

        item = response['Item']

        # Chuyển Decimal sang float
        processed_item = dict(item)
        if 'lat' in processed_item:
            processed_item['lat'] = float(processed_item['lat'])
        if 'lng' in processed_item:
            processed_item['lng'] = float(processed_item['lng'])

        # Nếu có query param presign=1, tạo presigned URL cho ảnh
        params = event.get("queryStringParameters") or {}
        if params.get('presign') == '1' and 'imageKey' in processed_item:
            import boto3
            s3 = boto3.client('s3')
            presigned_url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': BUCKET_NAME, 'Key': processed_item['imageKey']},
                ExpiresIn=3600
            )
            processed_item['imageUrl'] = presigned_url

        return _response(200, processed_item)

    except Exception as e:
        print(f"Error in get_article: {e}")
        return _response(500, {"error": f"internal error: {e}"})