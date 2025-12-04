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

        # Tìm theo tags - We'll do post-filtering in Python instead of DynamoDB filter
        # to avoid complex FilterExpression syntax errors
        tag_list = []  # Initialize empty list
        if tags:
            tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()]
            print(f"🔍 Searching for tags: {tag_list}")
            # Note: We'll filter by tags AFTER getting results from DynamoDB

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
            # Use query with GSI
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

            print(f"📊 Using QUERY with GSI: {index_name}")
            print(f"  - KeyCondition: {key_condition}")
            if filter_expression:
                print(f"  - FilterExpression: {filter_expression}")
            
            resp = table.query(**query_params)
        else:
            # Use scan for public articles (to include old articles with visibility=unknown)
            # Add visibility filter to only show public or unknown (treat unknown as public)
            visibility_filter = "visibility = :public OR attribute_not_exists(visibility) OR visibility = :unknown"
            expression_attribute_values[":public"] = "public"
            expression_attribute_values[":unknown"] = "unknown"
            
            if filter_expression:
                combined_filter = f"({visibility_filter}) AND ({filter_expression})"
            else:
                combined_filter = f"({visibility_filter})"
            
            scan_params = {
                "FilterExpression": combined_filter,
                "ExpressionAttributeValues": expression_attribute_values,
                "Limit": limit * 30,  # Scan more to account for post-filtering by tags
            }

            if expression_attribute_names:
                scan_params["ExpressionAttributeNames"] = expression_attribute_names
            if next_token:
                scan_params["ExclusiveStartKey"] = json.loads(next_token)

            print(f"📊 Using SCAN (for compatibility with old articles)")
            print(f"  - FilterExpression: {combined_filter}")
            print(f"  - Searching for tags: {tags}")
            print(f"  - Tag list: {tag_list if tags else 'N/A'}")
            
            resp = table.scan(**scan_params)

        items = resp.get("Items", [])
        last_key = resp.get("LastEvaluatedKey")
        
        # Debug: Log returned items with their tags
        print(f"📦 Found {len(items)} items from DynamoDB")
        
        # If searching by tags, log ALL items with matching tags (before completeness filter)
        if tags and tag_list:
            matching_before_filter = []
            for item in items:
                item_tags = [str(t).lower() for t in (item.get('tags') or [])]
                item_auto_tags = [str(t).lower() for t in (item.get('autoTags') or [])]
                all_item_tags = item_tags + item_auto_tags
                if any(search_tag in all_item_tags for search_tag in tag_list):
                    matching_before_filter.append(item)
            print(f"🏷️ Found {len(matching_before_filter)} items with matching tags BEFORE completeness filter")
            for item in matching_before_filter[:5]:
                article_id = item.get('articleId', 'unknown')
                print(f"  - Article {article_id}")
                print(f"    tags: {item.get('tags', [])}")
                print(f"    autoTags: {item.get('autoTags', [])}")
                print(f"    title: {item.get('title', 'N/A')}")
                print(f"    lat/lng: {item.get('lat')}/{item.get('lng')}")
                print(f"    imageKey: {item.get('imageKey', 'N/A')}")
                print(f"    imageKeys: {item.get('imageKeys', [])}")
                print(f"    createdAt: {item.get('createdAt', 'N/A')}")
        else:
            for item in items[:3]:  # Log first 3 items
                article_id = item.get('articleId', 'unknown')
                user_tags = item.get('tags', [])
                auto_tags = item.get('autoTags', [])
                print(f"  - Article {article_id[:8]}...")
                print(f"    tags: {user_tags}")
                print(f"    autoTags: {auto_tags}")

        # Filter out incomplete articles (must have required fields)
        # When searching by tags, we relax the requirements slightly
        complete_items = []
        for item in items:
            # Check if article has minimum required fields
            has_content = item.get('title') or item.get('content')
            has_location = item.get('lat') and item.get('lng')
            has_image = _has_image(item)
            has_created = item.get('createdAt')
            
            # When searching by tags, only require image and createdAt
            # (user is specifically looking for tagged content)
            if tags and tag_list:
                if has_image and has_created:
                    complete_items.append(item)
                else:
                    missing = []
                    if not has_image: missing.append('image')
                    if not has_created: missing.append('createdAt')
                    print(f"  ⚠️ Skipping article (tag search): {item.get('articleId', 'unknown')[:8]}... (missing: {', '.join(missing)})")
            else:
                # Normal search requires all fields
                if has_content and has_location and has_image and has_created:
                    complete_items.append(item)
                else:
                    # Log more details about why article was skipped
                    missing = []
                    if not has_content: missing.append('content/title')
                    if not has_location: missing.append('location')
                    if not has_image: missing.append('image')
                    if not has_created: missing.append('createdAt')
                    print(f"  ⚠️ Skipping incomplete article: {item.get('articleId', 'unknown')[:8]}... (missing: {', '.join(missing)})")
                    # Also log tags for debugging tag search
                    if tags:
                        item_tags = item.get('tags', [])
                        item_auto_tags = item.get('autoTags', [])
                        print(f"      tags: {item_tags}, autoTags: {item_auto_tags}")
        
        print(f"✅ After completeness filter: {len(complete_items)} items (from {len(items)} items)")
        items = complete_items

        # POST-FILTERING by tags (if tags parameter provided)
        if tags and tag_list:
            print(f"🔍 Post-filtering by tags: {tag_list}")
            filtered_items = []
            
            # If we don't have enough items after filtering, keep scanning
            scan_iterations = 0
            max_iterations = 10  # Prevent infinite loops
            current_last_key = last_key
            
            while len(filtered_items) < limit and scan_iterations < max_iterations:
                for item in items:
                    item_tags = [str(t).lower() for t in (item.get('tags') or [])]
                    item_auto_tags = [str(t).lower() for t in (item.get('autoTags') or [])]
                    all_item_tags = item_tags + item_auto_tags
                    
                    # Check if ANY of the search tags matches EXACTLY with item tags
                    if any(search_tag in all_item_tags for search_tag in tag_list):
                        # Avoid duplicates
                        if not any(f.get('articleId') == item.get('articleId') for f in filtered_items):
                            filtered_items.append(item)
                            if len(filtered_items) <= 5:  # Log first 5 matches
                                print(f"  ✅ MATCH: {item.get('articleId', 'unknown')[:8]}... tags={all_item_tags}")
                
                # If we have enough items or no more pages, stop
                if len(filtered_items) >= limit or not current_last_key:
                    break
                
                # Continue scanning for more items
                scan_iterations += 1
                print(f"🔄 Scan iteration {scan_iterations}: found {len(filtered_items)} matches, need {limit}")
                
                scan_params = {
                    "FilterExpression": combined_filter,
                    "ExpressionAttributeValues": expression_attribute_values,
                    "Limit": limit * 20,  # Scan more items
                    "ExclusiveStartKey": current_last_key
                }
                if expression_attribute_names:
                    scan_params["ExpressionAttributeNames"] = expression_attribute_names
                
                resp = table.scan(**scan_params)
                items = resp.get("Items", [])
                current_last_key = resp.get("LastEvaluatedKey")
                
                # Filter incomplete articles (relaxed for tag search)
                complete_items = []
                for item in items:
                    has_image = _has_image(item)
                    has_created = item.get('createdAt')
                    # For tag search, only require image and createdAt
                    if has_image and has_created:
                        complete_items.append(item)
                items = complete_items
            
            print(f"✅ After tag filter: {len(filtered_items)} items (after {scan_iterations + 1} scan iterations)")
            
            # Take only the requested limit
            items = filtered_items[:limit]
            
            # Clear pagination token since we did post-filtering
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
