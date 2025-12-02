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
                # Chuyển Decimal sang int nếu là số nguyên, ngược lại float
                out[k] = int(v) if v % 1 == 0 else float(v)
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

        # Tìm theo text: title / content / locationName (case-insensitive)
        if q:
            q_lower = q.lower()
            expression_attribute_names["#titleLower"] = "titleLower"
            expression_attribute_names["#contentLower"] = "contentLower"
            expression_attribute_names["#locationNameLower"] = "locationNameLower"
            expression_attribute_values[":q"] = q_lower

            filter_parts.append(
                "contains(#titleLower, :q) OR "
                "contains(#contentLower, :q) OR "
                "(attribute_exists(#locationNameLower) AND contains(#locationNameLower, :q))"
            )

        # Tìm theo tags
        if tags:
            tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()]
            if tag_list:
                tag_conditions = []
                for i, tag in enumerate(tag_list):
                    expression_attribute_names[f"#tag{i}"] = "tags"
                    expression_attribute_values[f":tag{i}"] = tag
                    tag_conditions.append(f"contains(#tag{i}, :tag{i})")

                if tag_conditions:
                    filter_parts.append("(" + " OR ".join(tag_conditions) + ")")

        # Combine filters với AND
        filter_expression = None
        if filter_parts:
            if len(filter_parts) == 1:
                filter_expression = filter_parts[0]
            else:
                filter_expression = " AND ".join([f"({part})" for part in filter_parts])

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
        return error(500, f"internal error: {e}")
