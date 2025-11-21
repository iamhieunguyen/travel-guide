import os
import json
import uuid
import boto3
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_parent_dir = os.path.join(current_dir, '..', '..')
sys.path.insert(0, parent_parent_dir)

from utils import *

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

        # Tạo key chuẩn hóa
        key = f"articles/{uuid.uuid4()}.{ext or 'bin'}"

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

        return _resp(200, {"uploadUrl": url, "key": key, "expiresIn": 900})
    except Exception as e:
        return _resp(500, {"error": f"internal error: {e}"})