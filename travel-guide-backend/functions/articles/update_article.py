import os
import json
import boto3
from decimal import Decimal
from cors import ok, error, options

dynamodb = boto3.resource("dynamodb")

TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]
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
    method = (event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method"))
    if method == "OPTIONS":
        return options()

    try:
        path_params = event.get("pathParameters") or {}
        article_id = path_params.get("articleId")

        if not article_id:
            return _response(400, {"error": "articleId is required"})

        body_str = event.get("body") or ""
        if event.get("isBase64Encoded"):
            body_str = base64.b64decode(body_str).decode("utf-8", errors="ignore")
        data = json.loads(body_str or "{}")

        # Chỉ cập nhật các field được cung cấp
        update_expression = "SET "
        expression_attribute_names = {}
        expression_attribute_values = {}

        for key, value in data.items():
            if key in ["title", "content", "visibility", "lat", "lng", "tags", "imageKey"]:
                update_expression += f"#{key} = :{key}, "
                expression_attribute_names[f"#{key}"] = key
                if key in ["lat", "lng"]:
                    expression_attribute_values[f":{key}"] = Decimal(str(value))
                else:
                    expression_attribute_values[f":{key}"] = value

        # Loại bỏ dấu phẩy cuối cùng
        update_expression = update_expression.rstrip(", ")

        response = table.update_item(
            Key={'articleId': article_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="ALL_NEW"
        )

        item = response['Attributes']
        processed_item = dict(item)
        if 'lat' in processed_item:
            processed_item['lat'] = float(processed_item['lat'])
        if 'lng' in processed_item:
            processed_item['lng'] = float(processed_item['lng'])

        return _response(200, processed_item)

    except Exception as e:
        print(f"Error in update_article: {e}")
        return _response(500, {"error": f"internal error: {e}"})