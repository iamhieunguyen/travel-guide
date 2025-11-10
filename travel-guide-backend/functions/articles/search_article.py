import os
import json
import boto3
from decimal import Decimal

dynamodb = boto3.resource("dynamodb")

TABLE_NAME = os.environ["TABLE_NAME"]
table = dynamodb.Table(TABLE_NAME)

def _response(status, body_dict):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body_dict, ensure_ascii=False),
    }

def lambda_handler(event, context):
    try:
        # Đây là một ví dụ đơn giản về tìm kiếm toàn văn bản
        # Bạn có thể cải tiến để tìm kiếm theo bbox, tags, v.v.
        params = event.get("queryStringParameters") or {}
        q = params.get("q", "")
        bbox = params.get("bbox") # Ví dụ: "minLng,minLat,maxLng,maxLat"
        tags = params.get("tags", "")
        scope = params.get("scope", "public")
        limit = int(params.get("limit", 10))
        next_token = params.get("nextToken")

        # Điều kiện query
        filter_expression = "contains(#title, :q) OR contains(#content, :q)"
        expression_attribute_names = {"#title": "title", "#content": "content"}
        expression_attribute_values = {":q": q}

        if tags:
            tag_list = tags.split(',')
            filter_expression += " AND ("
            for i, tag in enumerate(tag_list):
                tag_key = f":tag{i}"
                filter_expression += f"contains(#tags, {tag_key})"
                if i < len(tag_list) - 1:
                    filter_expression += " OR "
                expression_attribute_names[f"#tag{i}"] = "tags"
                expression_attribute_values[tag_key] = tag.strip()
            filter_expression += ")"

        query_params = {
            'IndexName': 'gsi_visibility_createdAt', # Dùng GSI để query nhanh
            'KeyConditionExpression': 'visibility = :visibility',
            'FilterExpression': filter_expression,
            'ExpressionAttributeNames': expression_attribute_names,
            'ExpressionAttributeValues': expression_attribute_values,
            'ScanIndexForward': False, # Mới nhất trước
            'Limit': limit
        }

        if scope != "public":
            # Nếu không phải public, có thể cần logic khác hoặc query riêng theo ownerId
            pass

        if next_token:
            query_params['ExclusiveStartKey'] = json.loads(next_token)

        response = table.query(**query_params)

        items = response['Items']
        next_key = response.get('LastEvaluatedKey')

        # Chuyển Decimal sang float cho frontend
        processed_items = []
        for item in items:
            processed_item = dict(item)
            if 'lat' in processed_item:
                processed_item['lat'] = float(processed_item['lat'])
            if 'lng' in processed_item:
                processed_item['lng'] = float(processed_item['lng'])
            processed_items.append(processed_item)

        result = {
            'items': processed_items
        }
        if next_key:
            result['nextToken'] = json.dumps(next_key)

        return _response(200, result)

    except Exception as e:
        print(f"Error in search_articles: {e}")
        return _response(500, {"error": f"internal error: {e}"})