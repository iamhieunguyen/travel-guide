# functions/articles/unfavorite_article.py
import os
import json
import boto3
from cors import ok, error, options

dynamodb = boto3.resource("dynamodb")

ARTICLES_TABLE_NAME = os.environ["TABLE_NAME"]
FAVORITES_TABLE_NAME = os.environ["FAVORITES_TABLE_NAME"]

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


def lambda_handler(event, context):
    method = (event.get("httpMethod") or
              event.get("requestContext", {}).get("http", {}).get("method"))
    if method == "OPTIONS":
        return options()

    if method != "DELETE":
        return error(405, "Method not allowed")

    try:
        user_id = _get_current_user_id(event)
        if not user_id:
            return error(401, "Unauthorized: user not found")

        path_params = event.get("pathParameters") or {}
        article_id = path_params.get("articleId")
        if not article_id:
            return error(400, "articleId is required")

        # Xóa khỏi favorites table
        favorites_table.delete_item(
            Key={
                "userId": user_id,
                "articleId": article_id,
            }
        )

        # Giảm favoriteCount trong articles table (không cho âm)
        articles_table = dynamodb.Table(ARTICLES_TABLE_NAME)
        articles_table.update_item(
            Key={"articleId": article_id},
            UpdateExpression="SET favoriteCount = if_not_exists(favoriteCount, :zero) - :dec",
            ExpressionAttributeValues={
                ":zero": 0,
                ":dec": 1
            },
            # Đảm bảo không âm
            ConditionExpression="favoriteCount > :zero OR attribute_not_exists(favoriteCount)"
        )

        return ok(200, {
            "message": "Article unfavorited",
            "userId": user_id,
            "articleId": article_id,
        })

    except Exception as e:
        print("Error in unfavorite_article:", e)
        return error(500, "Internal server error")
