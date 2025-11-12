import os
import json
import boto3
from cors import ok, error, options  # Giữ nguyên nếu bạn dùng module cors riêng

# Khởi tạo clients
dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")

# Lấy biến môi trường
TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]
table = dynamodb.Table(TABLE_NAME)


def _response(status_code, body_dict):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-User-Id",
        },
        "body": json.dumps(body_dict, ensure_ascii=False),
    }


def _get_user_id(event):
    """Trích xuất user ID từ Cognito JWT token (hỗ trợ REST API + HTTP API)"""
    rc = event.get("requestContext") or {}
    auth = rc.get("authorizer") or {}

    # Trường hợp dùng REST API với Cognito Authorizer (SAM mặc định)
    claims = auth.get("claims") or {}
    if claims:
        return claims.get("sub") or claims.get("cognito:username")

    # Trường hợp dùng HTTP API (nếu có)
    jwt = auth.get("jwt") or {}
    jwt_claims = jwt.get("claims") or {}
    if jwt_claims:
        return jwt_claims.get("sub") or jwt_claims.get("cognito:username")

    # Fallback cho dev (KHÔNG DÙNG TRONG PROD)
    headers = event.get("headers") or {}
    return headers.get("X-User-Id") or headers.get("x-user-id")


def lambda_handler(event, context):
    # Xử lý preflight CORS
    method = (event.get("httpMethod") or 
              event.get("requestContext", {}).get("http", {}).get("method"))
    if method == "OPTIONS":
        return options()

    try:
        # 🔐 Bước 1: Lấy ID người dùng hiện tại
        current_user_id = _get_user_id(event)
        if not current_user_id:
            return _response(401, {"error": "Unauthorized: User identity not found"})

        # 📌 Bước 2: Lấy articleId từ path
        path_params = event.get("pathParameters") or {}
        article_id = path_params.get("articleId")
        if not article_id:
            return _response(400, {"error": "Missing articleId in path"})

        # 📥 Bước 3: Lấy bài viết từ DynamoDB
        response = table.get_item(Key={"articleId": article_id})
        if "Item" not in response:
            return _response(404, {"error": "Article not found"})

        article = response["Item"]
        owner_id = article.get("ownerId")

        # 🔒 Bước 4: Kiểm tra quyền sở hữu
        if owner_id != current_user_id:
            return _response(403, {"error": "Forbidden: You do not own this article"})

        # 🗑️ Bước 5: Xóa bài viết khỏi DynamoDB
        table.delete_item(Key={"articleId": article_id})

        # 🖼️ Bước 6: Xóa ảnh chính (nếu có)
        image_key = article.get("imageKey")
        if image_key:
            try:
                s3.delete_object(Bucket=BUCKET_NAME, Key=image_key)
            except Exception as s3_err:
                print(f"Warning: Failed to delete S3 object {image_key}: {s3_err}")

        # 🧹 (Tuỳ chọn) Xóa thumbnail nếu bạn lưu dưới dạng `{imageKey}.thumb.jpg`
        if image_key:
            thumb_key = f"{image_key}.thumb.jpg"
            try:
                s3.delete_object(Bucket=BUCKET_NAME, Key=thumb_key)
            except Exception as thumb_err:
                print(f"Warning: Thumbnail not found or failed to delete: {thumb_err}")

        # ✅ Thành công
        return _response(200, {"message": "Article deleted successfully"})

    except Exception as e:
        print(f"Error in delete_article: {str(e)}")
        return _response(500, {"error": "Internal server error"})