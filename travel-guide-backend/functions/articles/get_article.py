import os, json, boto3, time
from urllib.parse import parse_qs

dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")

TABLE = os.environ["TABLE_NAME"]
BUCKET = os.environ["BUCKET_NAME"]
RETURN_403 = (os.environ.get("RETURN_403_ON_PRIVATE", "false").lower() == "true")

table = dynamodb.Table(TABLE)

def _resp(c, b):
    return {
        "statusCode": c,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(b, ensure_ascii=False),
    }

def _uid(event):
    h = event.get("headers") or {}
    return h.get("X-User-Id") or h.get("x-user-id")

def _want_presign(event) -> bool:
    # support both v1/v2 http api query parsing
    qs = event.get("rawQueryString") or ""
    if qs:
        q = parse_qs(qs)
        if "presign" in q and q["presign"] and q["presign"][0] in ("1", "true", "yes"):
            return True
    q2 = event.get("queryStringParameters") or {}
    return str(q2.get("presign", "0")).lower() in ("1", "true", "yes")

def lambda_handler(event, ctx):
    aid = (event.get("pathParameters") or {}).get("id")
    if not aid:
        return _resp(400, {"error": "missing id"})

    res = table.get_item(Key={"articleId": aid})
    item = res.get("Item")
    if not item:
        return _resp(404, {"error": "not found"})

    vis = (item.get("visibility") or "public").lower()
    owner = item.get("ownerId") or ""
    user = _uid(event)

    if vis == "private" and (not user or user != owner):
        # Tránh lộ thông tin: mặc định trả 404; đặt env RETURN_403_ON_PRIVATE=true để trả 403
        if RETURN_403:
            return _resp(403, {"error": "forbidden"})
        return _resp(404, {"error": "not found"})

    # (Tuỳ chọn) Ẩn ownerId nếu người xem không phải chủ
    if user != owner:
        item = dict(item)  # shallow copy
        item.pop("ownerId", None)

    # (Tuỳ chọn) Trả presigned GET URL để xem ảnh
    if _want_presign(event):
        key = item.get("imageKey")
        if key:
            try:
                url = s3.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": BUCKET, "Key": key},
                    ExpiresIn=600,  # 10 phút
                )
                item["imageUrl"] = url
                item["imageUrlExpiresIn"] = 600
            except Exception:
                # Không làm fail nếu không presign được
                pass

    return _resp(200, item)
