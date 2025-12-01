# functions/articles/favorite_article.py
import os
import json
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key
from cors import ok, error, options

dynamodb = boto3.resource("dynamodb")

ARTICLES_TABLE_NAME = os.environ["TABLE_NAME"]
FAVORITES_TABLE_NAME = os.environ["FAVORITES_TABLE_NAME"]

articles_table = dynamodb.Table(ARTICLES_TABLE_NAME)
favorites_table = dynamodb.Table(FAVORITES_TABLE_NAME)


def _get_current_user_id(event):
    """
    Ưu tiên lấy từ Cognito (sub), fallback sang header X-User-Id
    để phù hợp với create_article + list_articles.
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


def lambda_handler(event, context):
    method = (event.get("httpMethod") or
              event.get("requestContext", {}).get("http", {}).get("method"))
    if method == "OPTIONS":
        return options()

    if method != "POST":
        return error(405, "Method not allowed")

    try:
        user_id = _get_current_user_id(event)
        if not user_id:
            return error(401, "Unauthorized: user not found")

        path_params = event.get("pathParameters") or {}
        article_id = path_params.get("articleId")
        if not article_id:
            return error(400, "articleId is required")

        # (Optional) kiểm tra bài viết có tồn tại
        art_resp = articles_table.get_item(Key={"articleId": article_id})
        if "Item" not in art_resp:
            return error(404, "Article not found")

        now = datetime.now(timezone.utc).isoformat()

        favorites_table.put_item(
            Item={
                "userId": user_id,
                "articleId": article_id,
                "createdAt": now,
            }
        )

        return ok(200, {
            "message": "Article favorited",
            "userId": user_id,
            "articleId": article_id,
        })

    except Exception as e:
        print("Error in favorite_article:", e)
        return error(500, "Internal server error")
