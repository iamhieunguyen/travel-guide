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


def _has_image(item):
    """Check if article has at least one image"""
    image_key = item.get('imageKey')
    image_keys = item.get('imageKeys') or []
    return bool(image_key) or len(image_keys) > 0


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
            # Mặc định: tìm trong bài public
            # Note: We can't use GSI for this because old articles have visibility=unknown
            # We'll need to scan or use a different approach
            # For now, let's use scan with filter for better compatibility
            index_name = None  # Will use scan instead
            key_condition = None

        # ------------------------------
        # 2) Xây FilterExpression (q, tags, bbox...)
        # ------------------------------
        filter_parts = []

        # NEW: Filter by status for public searches (not for "mine" scope)
        # TEMPORARILY DISABLED - Allow all posts to be searchable for testing
        # TODO: Re-enable after content moderation is working
        # if scope != "mine" or not user_id:
        #     expression_attribute_names["#status"] = "status"
        #     expression_attribute_values[":approved"] = "approved"
        #     # Use OR to include legacy articles without status field
        #     filter_parts.append(
        #         "(#status = :approved OR attribute_not_exists(#status))"
        #     )

        # Tìm theo text: title / content / locationName (case-insensitive)
        # Support both old (title/content/locationName) and new (*Lower) fields
        if q:
            q_lower = q.lower()
            
            # New fields (lowercase) - preferred for performance
            expression_attribute_names["#titleLower"] = "titleLower"
            expression_attribute_names["#contentLower"] = "contentLower"
            expression_attribute_names["#locationNameLower"] = "locationNameLower"
            
            expression_attribute_values[":q"] = q_lower

            # Search in lowercase fields (will work for new articles)
            # Note: Old articles without *Lower fields won't match here
            # Run migrate_lowercase_fields.py to fix old articles
            filter_parts.append(
                "("
                "(attribute_exists(#titleLower) AND contains(#titleLower, :q)) OR "
                "(attribute_exists(#contentLower) AND contains(#contentLower, :q)) OR "
                "(attribute_exists(#locationNameLower) AND contains(#locationNameLower, :q))"
                ")"
            )

        # Tìm theo tags (search in both 'tags' and 'autoTags' fields)
        # IMPORTANT: DynamoDB's contains() does substring matching, not exact matching
        # So "food" will match both "food" and "seafood"
        # We need to ensure tags are stored in normalized form (lowercase, trimmed)
        # and accept that contains() will do substring matching
        if tags:
            tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()]
            print(f"🔍 Searching for tags: {tag_list}")
            
            if tag_list:
                tag_conditions = []
                
                for i, tag in enumerate(tag_list):
                    tag_value = tag.lower()  # Ensure lowercase for comparison
                    
                    # Create unique attribute names for each tag check
                    tags_attr = f"#tags{i}"
                    auto_tags_attr = f"#autoTags{i}"
                    tag_val_attr = f":tag{i}"
                    
                    expression_attribute_names[tags_attr] = "tags"
                    expression_attribute_names[auto_tags_attr] = "autoTags"
                    expression_attribute_values[tag_val_attr] = tag_value
                    
                    # Use contains() for LIST attributes
                    # Note: This does substring matching, so "food" matches "seafood"
                    # To avoid this, we need to ensure tags don't have overlapping names
                    # or implement post-filtering in application code
                    tag_conditions.append(
                        f"(contains({tags_attr}, {tag_val_attr}) OR "
                        f"(attribute_exists({auto_tags_attr}) AND contains({auto_tags_attr}, {tag_val_attr})))"
                    )

                if tag_conditions:
                    # Use OR to match any of the requested tags
                    if len(tag_conditions) == 1:
                        # Single tag: no need for extra parentheses
                        filter_parts.append(tag_conditions[0])
                    else:
                        # Multiple tags: wrap in parentheses
                        filter_parts.append("(" + " OR ".join(tag_conditions) + ")")

        # Combine filters với AND
        filter_expression = None
        if filter_parts:
            if len(filter_parts) == 1:
                filter_expression = filter_parts[0]
            else:
                filter_expression = " AND ".join(filter_parts)

        # ------------------------------
        # 3) Gọi DynamoDB query hoặc scan
        # ------------------------------
        if index_name and key_condition:
            # Path 1: Query with GSI for personal searches
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
                query_params["ExclusiveStartKey"] = json.loads(next_token)

<<<<<<< HEAD
        # Debug logging
        print(f"📊 Query params:")
        print(f"  - IndexName: {query_params.get('IndexName')}")
        print(f"  - KeyCondition: {query_params.get('KeyConditionExpression')}")
        if filter_expression:
            print(f"  - FilterExpression: {filter_expression}")
        print(f"  - AttributeNames: {expression_attribute_names}")
        print(f"  - AttributeValues: {expression_attribute_values}")
        
        resp = table.query(**query_params)
=======
            # Debug logging for query
            print(f"📊 Query operation:")
            print(f"  - IndexName: {query_params.get('IndexName')}")
            print(f"  - KeyCondition: {query_params.get('KeyConditionExpression')}")
            if filter_expression:
                print(f"  - FilterExpression: {filter_expression}")
            print(f"  - AttributeNames: {expression_attribute_names}")
            print(f"  - AttributeValues: {expression_attribute_values}")
            
            resp = table.query(**query_params)
        else:
            # Path 2: Scan for public searches
            # IMPORTANT: DynamoDB applies FilterExpression AFTER scanning Limit items
            # So we need to scan MORE items to get enough results after filtering
            # Use a larger scan limit and then trim results to requested limit
            scan_limit = limit * 10  # Scan 10x more items to account for filtering
            
            scan_params = {
                "Limit": scan_limit,
            }

            if expression_attribute_names:
                scan_params["ExpressionAttributeNames"] = expression_attribute_names
            if expression_attribute_values:
                scan_params["ExpressionAttributeValues"] = expression_attribute_values
            if filter_expression:
                scan_params["FilterExpression"] = filter_expression
            if next_token:
                scan_params["ExclusiveStartKey"] = json.loads(next_token)

            # Debug logging for scan
            print(f"📊 Scan operation:")
            print(f"  - Scan Limit: {scan_params.get('Limit')} (requested: {limit})")
            if filter_expression:
                print(f"  - FilterExpression: {filter_expression}")
            print(f"  - AttributeNames: {expression_attribute_names}")
            print(f"  - AttributeValues: {expression_attribute_values}")
            
            resp = table.scan(**scan_params)
            
            # Trim results to requested limit
            items_before_trim = resp.get("Items", [])
            if len(items_before_trim) > limit:
                print(f"  - Trimming {len(items_before_trim)} items to {limit}")
                resp["Items"] = items_before_trim[:limit]
                # Keep LastEvaluatedKey for pagination
>>>>>>> a3b812c3104d06b6d08bded7f3e501f0337a0999

        items = resp.get("Items", [])
        last_key = resp.get("LastEvaluatedKey")
        
        # Debug: Log returned items with their tags
        print(f"📦 Found {len(items)} items from DynamoDB")
        for item in items[:3]:  # Log first 3 items
            article_id = item.get('articleId', 'unknown')
            user_tags = item.get('tags', [])
            auto_tags = item.get('autoTags', [])
            print(f"  - Article {article_id[:8]}...")
            print(f"    tags: {user_tags}")
            print(f"    autoTags: {auto_tags}")


        if tags:
            tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()]
            filtered_items = []
            
            for item in items:
                item_tags = [str(t).lower() for t in (item.get('tags') or [])]
                item_auto_tags = [str(t).lower() for t in (item.get('autoTags') or [])]
                all_item_tags = item_tags + item_auto_tags
                
                # Debug each item
                print(f"  🔎 Checking article {item.get('articleId', 'unknown')[:8]}...")
                print(f"     Search tags: {tag_list}")
                print(f"     Item tags: {all_item_tags}")
                
                # Check if ANY of the search tags matches EXACTLY with item tags
                if any(search_tag in all_item_tags for search_tag in tag_list):
                    print(f"     ✅ MATCH!")
                    filtered_items.append(item)
                else:
                    print(f"     ❌ NO MATCH")
            
            print(f"✅ After exact match filter: {len(filtered_items)} items (from {len(items)} items)")
            items = filtered_items
            
            # IMPORTANT: Clear last_key if we filtered items
            # Because pagination token is no longer valid after filtering
            if len(filtered_items) < len(resp.get("Items", [])):
                last_key = None
                print(f"⚠️ Cleared pagination token due to post-filtering")

        processed_items = [_convert_decimal(it) for it in items]

        result = {"items": processed_items}
        if last_key:
            result["nextToken"] = json.dumps(last_key)

        return ok(200, result)

    except Exception as e:
        print("Error in search_articles:", e)
        return error(500, f"internal error: {e}")
