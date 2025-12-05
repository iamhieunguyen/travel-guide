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
        # 🔐 LẤY USER INFO TỪ COGNITO AUTHORIZER (nếu có)
        claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
        owner_id = claims.get("sub")  # UUID của user
        user_email = claims.get("email")  # Email của user
        
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

        # 📝 Chuẩn bị metadata để lưu vào S3
        # Metadata này sẽ được dùng bởi content_moderation để gửi email
        metadata = {}
        if owner_id:
            metadata['owner-id'] = owner_id
        if user_email:
            metadata['user-email'] = user_email  # ← THÊM EMAIL VÀO METADATA
        
        # Thêm timestamp để tracking
        from datetime import datetime, timezone
        metadata['upload-timestamp'] = datetime.now(timezone.utc).isoformat()
        
        print(f"📝 Generating presigned URL with metadata:")
        print(f"   Article ID: {article_id}")
        print(f"   Image ID: {image_id}")
        print(f"   Owner ID: {owner_id or 'N/A'}")
        print(f"   User Email: {user_email or 'N/A'}")

        # Tạo presigned URL cho PUT object với metadata
        url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": BUCKET,
                "Key": key,
                "ContentType": content_type,
                "Metadata": metadata  # ← THÊM METADATA VÀO PRESIGNED URL
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
        print(f"❌ Error generating upload URL: {e}")
        import traceback
        traceback.print_exc()
        return _resp(500, {"error": f"internal error: {e}"})