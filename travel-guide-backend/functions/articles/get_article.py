import os
import json
import boto3
from decimal import Decimal
from cors import ok, error, options # Giả định các hàm này đã được định nghĩa

# Clients
dynamodb = boto3.resource("dynamodb")
s3_client = boto3.client("s3") # Khởi tạo S3 client global

TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]
table = dynamodb.Table(TABLE_NAME)

def _response(status, body_dict):
    """Hàm tạo response chuẩn."""
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

        # Lấy bài viết từ DynamoDB
        response = table.get_item(Key={'articleId': article_id})

        if 'Item' not in response:
            return _response(404, {"error": "Article not found"})

        item = response['Item']

        # Chuyển Decimal sang float/int cho response
        processed_item = {}
        for k, v in item.items():
            if isinstance(v, Decimal):
                # Chuyển Decimal sang int nếu là số nguyên, ngược lại float
                processed_item[k] = int(v) if v % 1 == 0 else float(v)
            else:
                processed_item[k] = v
            
        # Đảm bảo imageKeys là list (DynamoDB có thể lưu Set/List)
        if 'imageKeys' in processed_item and not isinstance(processed_item['imageKeys'], list):
            # Ép kiểu nếu cần (ví dụ, nếu lưu dưới dạng DynamoDB Set)
            processed_item['imageKeys'] = list(processed_item['imageKeys'])

        # ----------------------------------------------------------------------
        ## 🖼️ Logic Xử lý Presigned URLs
        # ----------------------------------------------------------------------
        params = event.get("queryStringParameters") or {}
        if params.get('presign') == '1':
            
            # Ưu tiên xử lý mảng imageKeys (từ bài viết mới)
            image_keys_to_process = []
            if 'imageKeys' in processed_item and processed_item['imageKeys']:
                image_keys_to_process = processed_item['imageKeys']
            # Fallback cho bài viết cũ chỉ có imageKey
            elif 'imageKey' in processed_item:
                image_keys_to_process = [processed_item['imageKey']]
            
            # Tạo presigned URLs
            if image_keys_to_process:
                image_urls = []
                for key in image_keys_to_process:
                    try:
                        # Tạo presigned URL cho từng key
                        presigned_url = s3_client.generate_presigned_url(
                            'get_object',
                            Params={'Bucket': BUCKET_NAME, 'Key': key},
                            ExpiresIn=3600
                        )
                        image_urls.append(presigned_url)
                    except Exception as e:
                        print(f"Error generating presigned URL for key {key}: {e}")
                
                if image_urls:
                    # Trả về danh sách URL mới
                    processed_item['imageUrls'] = image_urls
                    # Trả về imageUrl cho tương thích ngược (ảnh cover)
                    processed_item['imageUrl'] = image_urls[0]

        return _response(200, processed_item)

    except Exception as e:
        print(f"Error in get_article: {e}")
        return _response(500, {"error": f"internal error: {e}"})