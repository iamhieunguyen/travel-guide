# functions/articles/list_favorite_articles.py
import os
import json
import boto3
from decimal import Decimal
from boto3.dynamodb.conditions import Key
from cors import ok, error, options

dynamodb = boto3.resource("dynamodb")

ARTICLES_TABLE_NAME = os.environ["TABLE_NAME"]
FAVORITES_TABLE_NAME = os.environ["FAVORITES_TABLE_NAME"]

articles_table = dynamodb.Table(ARTICLES_TABLE_NAME)
favorites_table = dynamodb.Table(FAVORITES_TABLE_NAME)


def _get_current_user_id(event):
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
    Tiện ích nhỏ: chuyển Decimal sang float/int cho lat/lng và favoriteCount.
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
    method = (event.get("httpMethod") or
              event.get("requestContext", {}).get("http", {}).get("method"))
    if method == "OPTIONS":
        return options()

    if method != "GET":
        return error(405, "Method not allowed")

    try:
        user_id = _get_current_user_id(event)
        if not user_id:
            return error(401, "Unauthorized: user not found")

        # 1. Lấy danh sách favorite theo userId
        fav_resp = favorites_table.query(
            KeyConditionExpression=Key("userId").eq(user_id)
        )

        fav_items = fav_resp.get("Items", [])
        article_ids = [item["articleId"] for item in fav_items]

        if not article_ids:
            return ok(200, {"items": [], "count": 0})

        # 2. BatchGet sang ArticlesTable
        #    (BatchGet tối đa 100 keys/1 lần; ở đây demo đơn giản)
        keys = [{"articleId": aid} for aid in article_ids]

        client = dynamodb.meta.client
        batch_resp = client.batch_get_item(
            RequestItems={
                ARTICLES_TABLE_NAME: {
                    "Keys": keys
                }
            }
        )

        articles = batch_resp["Responses"].get(ARTICLES_TABLE_NAME, [])

        # 3. Convert Decimal và đảm bảo có username
        processed = []
        for art in articles:
            obj = _convert_decimal(art)
            # Đảm bảo có username để hiển thị tên người đăng
            if "username" not in obj or not obj["username"]:
                obj["username"] = "Người dùng ẩn danh"
            processed.append(obj)

        return ok(200, {
            "items": processed,
            "count": len(processed),
        })

    except Exception as e:
        print("Error in list_favorite_articles:", e)
        return error(500, "Internal server error")
