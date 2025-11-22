# cors.py
import os, json

CORS_ORIGIN = os.getenv("CORS_ORIGIN", "d2y3ih2q5mccr3.cloudfront.net")

def cors_headers():
    return {
        "Access-Control-Allow-Origin": CORS_ORIGIN,  # dev có thể dùng '*'
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-User-Id",
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PATCH,DELETE",
    }

def ok(status, body):
    return {"statusCode": status, "headers": cors_headers(),
            "body": json.dumps(body, ensure_ascii=False)}

def options():
    return {"statusCode": 204, "headers": cors_headers(), "body": ""}

def error(status, msg):
    return {"statusCode": status, "headers": cors_headers(),
            "body": json.dumps({"error": msg}, ensure_ascii=False)}
