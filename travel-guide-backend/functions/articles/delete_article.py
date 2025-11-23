import os
import json
import boto3
from cors import options, ok, error

dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")

TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]
table = dynamodb.Table(TABLE_NAME)


def lambda_handler(event, context):
    method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method")
    if method == "OPTIONS":
        return options()

    try:
        # 🔐 LẤY SUB TỪ COGNITO AUTHORIZER (SAM)
        claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
        current_user_id = claims.get("sub")
        if not current_user_id:
            return error(401, "Unauthorized: Missing or invalid token")

        # 📌 Lấy articleId
        article_id = (event.get("pathParameters") or {}).get("articleId")
        if not article_id:
            return error(400, "articleId is required")

        # 📥 Lấy bài viết
        response = table.get_item(Key={"articleId": article_id})
        if "Item" not in response:
            return error(404, "Article not found")

        article = response["Item"]
        owner_id = article.get("ownerId")

        # 🔒 SO SÁNH SUB (UUID vs UUID)
        if owner_id != current_user_id:
            print(f"❌ Permission denied: owner={owner_id}, current={current_user_id}")
            return error(403, "Forbidden: You do not own this article")

        # 🗑️ Xóa DB
        table.delete_item(Key={"articleId": article_id})

        # 🖼️ Xóa ảnh S3
        image_key = article.get("imageKey")
        if image_key:
            s3.delete_object(Bucket=BUCKET_NAME, Key=image_key)
            s3.delete_object(Bucket=BUCKET_NAME, Key=f"{image_key}.thumb.jpg")

        return ok(200, {"message": "Article deleted successfully"})

    except Exception as e:
        print(f"❌ Delete error: {e}")
        return error(500, "Internal server error")