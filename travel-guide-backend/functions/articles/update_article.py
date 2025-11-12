import os
import json
import base64
import boto3
from decimal import Decimal
from cors import ok, error, options

# Khởi tạo clients
dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]
table = dynamodb.Table(TABLE_NAME)


def _response(status_code, body_dict):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "PATCH,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-User-Id",
        },
        "body": json.dumps(body_dict, ensure_ascii=False),
    }


def _get_user_id(event):
    """Trích xuất user ID từ Cognito JWT token (REST API hoặc HTTP API)"""
    rc = event.get("requestContext") or {}
    auth = rc.get("authorizer") or {}

    # Trường hợp REST API với Cognito Authorizer
    claims = auth.get("claims") or {}
    if claims:
        return claims.get("sub") or claims.get("cognito:username")

    # Trường hợp HTTP API (nếu có)
    jwt = auth.get("jwt") or {}
    jwt_claims = jwt.get("claims") or {}
    if jwt_claims:
        return jwt_claims.get("sub") or jwt_claims.get("cognito:username")

    # Fallback dev (KHÔNG DÙNG TRONG PROD)
    headers = event.get("headers") or {}
    return headers.get("X-User-Id") or headers.get("x-user-id")


def lambda_handler(event, context):
    method = (event.get("httpMethod") or 
              event.get("requestContext", {}).get("http", {}).get("method"))
    if method == "OPTIONS":
        return options()

    try:
        #  1. Lấy ID người dùng hiện tại
        current_user_id = _get_user_id(event)
        if not current_user_id:
            return _response(401, {"error": "Unauthorized: User identity not found"})

        #  2. Lấy articleId từ path
        path_params = event.get("pathParameters") or {}
        article_id = path_params.get("articleId")
        if not article_id:
            return _response(400, {"error": "articleId is required"})

        #  3. Lấy bài viết hiện tại để kiểm tra quyền
        current_item_response = table.get_item(Key={"articleId": article_id})
        if "Item" not in current_item_response:
            return _response(404, {"error": "Article not found"})

        current_article = current_item_response["Item"]
        owner_id = current_article.get("ownerId")

        #  4. Kiểm tra quyền sở hữu
        if owner_id != current_user_id:
            return _response(403, {"error": "Forbidden: You do not own this article"})

        #  5. Parse body
        body_str = event.get("body") or ""
        if event.get("isBase64Encoded"):
            body_str = base64.b64decode(body_str).decode("utf-8", errors="ignore")
        data = json.loads(body_str or "{}")

        # Chỉ cho phép cập nhật các field hợp lệ
        allowed_fields = ["title", "content", "visibility", "lat", "lng", "tags", "imageKey"]
        update_expression = "SET "
        expression_attribute_names = {}
        expression_attribute_values = {}

        for key, value in data.items():
            if key in allowed_fields:
                update_expression += f"#{key} = :{key}, "
                expression_attribute_names[f"#{key}"] = key
                if key in ["lat", "lng"]:
                    expression_attribute_values[f":{key}"] = Decimal(str(value))
                else:
                    expression_attribute_values[f":{key}"] = value

        if len(expression_attribute_values) == 0:
            return _response(400, {"error": "No valid fields to update"})

        update_expression = update_expression.rstrip(", ")

        #  6. Cập nhật bài viết
        response = table.update_item(
            Key={"articleId": article_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="ALL_NEW"
        )

        # Xử lý Decimal → float cho JSON
        item = response["Attributes"]
        processed_item = {}
        for k, v in item.items():
            if isinstance(v, Decimal):
                processed_item[k] = float(v) if v % 1 != 0 else int(v)
            else:
                processed_item[k] = v

        return _response(200, processed_item)

    except json.JSONDecodeError:
        return _response(400, {"error": "Invalid JSON in request body"})
    except Exception as e:
        print(f"Error in update_article: {e}")
        return _response(500, {"error": "Internal server error"})