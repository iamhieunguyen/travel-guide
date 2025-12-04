import os
import json
import uuid
import boto3
from cors import ok, error, options

s3 = boto3.client("s3")
BUCKET = os.environ["BUCKET_NAME"]

def _resp(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, ensure_ascii=False),
    }

def lambda_handler(event, context):
    method = (event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method"))
    if method == "OPTIONS":
        return options()
    
    try:
        body = json.loads(event.get("body") or "{}")
        filename = (body.get("filename") or "").strip()
        content_type = (body.get("contentType") or "").strip()

        if not filename:
            return _resp(400, {"error": "filename is required"})
        if not content_type:
            return _resp(400, {"error": "contentType is required"})

        # Lấy extension từ filename
        ext = ""
        if "." in filename:
            ext = filename.split(".")[-1].lower()

        # Tạo UUID - sẽ được dùng làm articleId sau này
        # Frontend có thể gửi articleId nếu muốn upload nhiều ảnh cho cùng 1 bài
        article_id = body.get("articleId") or str(uuid.uuid4())
        
        # Tạo image_id riêng cho mỗi ảnh (để hỗ trợ nhiều ảnh/bài)
        image_id = str(uuid.uuid4())
        
        # Key format: articles/{articleId}_{imageId}.{ext}
        # Điều này cho phép Rekognition extract articleId đúng
        key = f"articles/{article_id}_{image_id}.{ext or 'bin'}"

        # Tạo presigned URL cho PUT object
        url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": BUCKET,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=900  # 15 phút
        )

        # Trả về articleId để frontend dùng khi tạo bài viết
        return _resp(200, {
            "uploadUrl": url, 
            "key": key, 
            "articleId": article_id,
            "expiresIn": 900
        })
    except Exception as e:
        return _resp(500, {"error": f"internal error: {e}"})