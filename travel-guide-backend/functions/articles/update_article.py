import os
import json
import base64
import boto3
from decimal import Decimal
from cors import ok, error, options

dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]
table = dynamodb.Table(TABLE_NAME)


def _get_user_id(event):
    rc = event.get("requestContext") or {}
    auth = rc.get("authorizer") or {}

    # REST API + Cognito User Pool Authorizer
    claims = auth.get("claims") or {}
    if claims:
        return claims.get("sub") or claims.get("cognito:username")

    # HTTP API + JWT Authorizer
    jwt = auth.get("jwt") or {}
    jwt_claims = jwt.get("claims") or {}
    if jwt_claims:
        return jwt_claims.get("sub") or jwt_claims.get("cognito:username")

    # Dev fallback
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
        print("DEBUG current_user_id =", current_user_id)

        if not current_user_id:
            return error(401, "Unauthorized: User identity not found")

        #  2. Lấy articleId từ path
        path_params = event.get("pathParameters") or {}
        article_id = path_params.get("articleId")
        print("DEBUG article_id =", article_id)

        if not article_id:
            return error(400, "articleId is required")

        #  3. Lấy bài viết hiện tại để kiểm tra quyền
        current_item_response = table.get_item(Key={"articleId": article_id})
        print("DEBUG TABLE_NAME =", TABLE_NAME)
        print("DEBUG get_item response =", current_item_response)

        if "Item" not in current_item_response:
            return error(404, "Article not found")

        current_article = current_item_response["Item"]
        owner_id = current_article.get("ownerId")
        print("DEBUG db_owner_id =", owner_id)

        #  4. Kiểm tra quyền sở hữu
        if owner_id != current_user_id:
            return error(403, "Forbidden: You do not own this article")

        #  5. Parse body
        body_str = event.get("body") or ""
        if event.get("isBase64Encoded"):
            body_str = base64.b64decode(body_str).decode("utf-8", errors="ignore")
        print("DEBUG raw_body =", body_str)
        data = json.loads(body_str or "{}")
        print("DEBUG parsed_data =", data)

        # ✅ Cho phép update locationName
        allowed_fields = ["title", "content", "visibility", "lat", "lng", "tags", "imageKey", "locationName"]
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

        print("DEBUG update_expression =", update_expression)
        print("DEBUG expr_attr_names =", expression_attribute_names)
        print("DEBUG expr_attr_values =", expression_attribute_values)

        if len(expression_attribute_values) == 0:
            return error(400, "No valid fields to update")

        update_expression = update_expression.rstrip(", ")

        #  6. Cập nhật bài viết
        response = table.update_item(
            Key={"articleId": article_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="ALL_NEW"
        )

        print("DEBUG update_item result =", response)

        item = response["Attributes"]
        processed_item = {}
        for k, v in item.items():
            if isinstance(v, Decimal):
                processed_item[k] = float(v) if v % 1 != 0 else int(v)
            else:
                processed_item[k] = v

        return ok(200, processed_item)

    except json.JSONDecodeError:
        return error(400, "Invalid JSON in request body")
    except Exception as e:
        print(f"Error in update_article: {e}")
        return error(500, "Internal server error")
