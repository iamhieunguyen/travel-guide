import os
import json
import boto3
from decimal import Decimal
from cors import ok, error, options

dynamodb = boto3.resource("dynamodb")

TABLE_NAME = os.environ["TABLE_NAME"]
table = dynamodb.Table(TABLE_NAME)


def _get_current_user_id(event):
    """
    Lấy userId giống các file khác:
    - Ưu tiên header X-User-Id (dùng cho local / test)
    - Nếu qua Cognito: lấy sub từ requestContext.authorizer.claims
    """
    headers = event.get("headers") or {}
    x_user_id = headers.get("X-User-Id") or headers.get("x-user-id")
    if x_user_id:
        return x_user_id

    rc = event.get("requestContext") or {}
    auth = rc.get("authorizer") or {}
    claims = auth.get("claims") or {}
    sub = claims.get("sub")
    if sub:
        return sub

    return None


def _convert_decimal(obj):
    """
    Chuyển Decimal sang kiểu bình thường cho FE.
    """
    if isinstance(obj, list):
        return [_convert_decimal(x) for x in obj]
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if isinstance(v, Decimal):
                out[k] = float(v)
            elif isinstance(v, (dict, list)):
                out[k] = _convert_decimal(v)
            else:
                out[k] = v
        return out
    return obj


def lambda_handler(event, context):
    method = (
        event.get("httpMethod")
        or event.get("requestContext", {}).get("http", {}).get("method")
    )
    if method == "OPTIONS":
        return options()

    if method != "GET":
        return error(405, "Method not allowed")

    try:
        params = event.get("queryStringParameters") or {}
        q = (params.get("q") or "").strip()
        bbox = params.get("bbox")  # hiện tại chưa dùng, có thể mở rộng sau
        tags = (params.get("tags") or "").strip()
        scope = params.get("scope", "public")
        limit = int(params.get("limit", 10))
        next_token = params.get("nextToken")

        user_id = _get_current_user_id(event)

        # ------------------------------
        # 1) Chuẩn bị phần KEY query
        # ------------------------------
        expression_attribute_names = {}
        expression_attribute_values = {}

        if scope == "mine" and user_id:
            # Tìm trong bài của chính user (public + private)
            index_name = "gsi_owner_createdAt"
            key_condition = "ownerId = :owner_id"
            expression_attribute_values[":owner_id"] = user_id
        else:
            # Mặc định: chỉ tìm trong bài public
            index_name = "gsi_visibility_createdAt"
            key_condition = "visibility = :visibility"
            expression_attribute_values[":visibility"] = "public"

        # ------------------------------
        # 2) Xây FilterExpression (q, tags, bbox...)
        # ------------------------------
        filter_parts = []

        # Tìm theo text: title / content
        if q:
            expression_attribute_names["#title"] = "title"
            expression_attribute_names["#content"] = "content"
            expression_attribute_names["#locationName"] = "locationName"

            expression_attribute_values[":q"] = q

            filter_parts.append(
                "("
                "contains(#title, :q) OR "
                "contains(#content, :q) OR "
                "contains(#locationName, :q)"
                ")"
            )

        # Tìm theo tags (tags là một list trong DynamoDB)
        if tags:
            tag_list = [t.strip() for t in tags.split(",") if t.strip()]
            if tag_list:
                expression_attribute_names["#tags"] = "tags"
                tag_conditions = []
                for i, tag in enumerate(tag_list):
                    tag_key = f":tag{i}"
                    tag_conditions.append(f"contains(#tags, {tag_key})")
                    expression_attribute_values[tag_key] = tag
                # (tagA OR tagB OR tagC)
                filter_parts.append("(" + " OR ".join(tag_conditions) + ")")

        # TODO: nếu sau này dùng bbox (lat/lng) thì thêm vào filter_parts tại đây

        filter_expression = None
        if filter_parts:
            filter_expression = " AND ".join(filter_parts)

        # ------------------------------
        # 3) Gọi DynamoDB query
        # ------------------------------
        query_params = {
            "IndexName": index_name,
            "KeyConditionExpression": key_condition,
            "ExpressionAttributeValues": expression_attribute_values,
            "ScanIndexForward": False,  # mới nhất trước
            "Limit": limit,
        }

        if expression_attribute_names:
            query_params["ExpressionAttributeNames"] = expression_attribute_names
        if filter_expression:
            query_params["FilterExpression"] = filter_expression
        if next_token:
            # nextToken từ FE là chuỗi JSON của LastEvaluatedKey
            query_params["ExclusiveStartKey"] = json.loads(next_token)

        resp = table.query(**query_params)

        items = resp.get("Items", [])
        last_key = resp.get("LastEvaluatedKey")

        processed_items = [_convert_decimal(it) for it in items]

        result = {"items": processed_items}
        if last_key:
            result["nextToken"] = json.dumps(last_key)

        return ok(200, result)

    except Exception as e:
        print("Error in search_articles:", e)
        # dùng error() để format giống các API khác
        return error(500, f"internal error: {e}")
