import os
import json
import uuid
import boto3
from utils.cors import ok, error, options

s3 = boto3.client("s3")
BUCKET = os.environ["BUCKET_NAME"]

def lambda_handler(event, context):
    method = (event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method"))
    if method == "OPTIONS":
        return options()
    
    try:
        body = json.loads(event.get("body") or "{}")
        filename = (body.get("filename") or "").strip()
        content_type = (body.get("contentType") or "").strip()

        if not filename:
            return error(400, "filename is required")
        if not content_type:
            return error(400, "contentType is required")

        # Lấy extension từ filename
        ext = ""
        if "." in filename:
            ext = filename.split(".")[-1].lower()

        # Tạo UUID - sẽ được dùng làm articleId sau này
        article_id = body.get("articleId") or str(uuid.uuid4())
        
        # Tạo image_id riêng cho mỗi ảnh
        image_id = str(uuid.uuid4())
        
        # Key format: articles/{articleId}_{imageId}.{ext}
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

        return ok(200, {
            "uploadUrl": url, 
            "key": key, 
            "articleId": article_id,
            "expiresIn": 900
        })
    except Exception as e:
        return error(500, f"internal error: {e}")
