import os, json, boto3, base64
from datetime import datetime, timezone
from decimal import Decimal
from boto3.dynamodb.conditions import Key

from utils.geo import geohash_encode

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])
BUCKET = os.environ["BUCKET_NAME"]

def _resp(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type":"application/json","Access-Control-Allow-Origin":"*"},
        "body": json.dumps(body, ensure_ascii=False),
    }

def _get_user_id(event):
    h = event.get("headers") or {}
    return h.get("X-User-Id") or h.get("x-user-id")

def _thumb_from_image_key(image_key: str) -> str:
    base = os.path.basename(image_key)
    stem = os.path.splitext(base)[0]
    return f"thumbnails/{stem}_256.webp"

def lambda_handler(event, context):
    article_id = (event.get("pathParameters") or {}).get("id")
    if not article_id:
        return _resp(400, {"error":"missing id"})

    user = _get_user_id(event)

    # Lấy item cũ & kiểm tra quyền (nếu đã có ownerId thì chỉ owner được sửa)
    old = table.get_item(Key={"articleId": article_id}).get("Item")
    if not old:
        return _resp(404, {"error":"not found"})
    if old.get("ownerId") and user != old.get("ownerId"):
        return _resp(403, {"error":"forbidden"})

    # Parse body
    body_str = event.get("body") or ""
    if event.get("isBase64Encoded"):
        body_str = base64.b64decode(body_str).decode("utf-8","ignore")
    data = json.loads(body_str or "{}")

    title       = data.get("title")
    content     = data.get("content")
    new_key     = data.get("imageKey")      # presigned flow
    visibility  = data.get("visibility")    # optional: public|private
    delete_old  = str(data.get("deleteOldImage", "true")).lower() != "false"  # default True
    tags        = data.get("tags", None)

    # geo (optional updates)
    lat_raw     = data.get("lat", None)
    lng_raw     = data.get("lng", None)

    # Nếu không có gì để update
    if all(v is None for v in [title, content, new_key, visibility, tags, lat_raw, lng_raw]):
        return _resp(400, {"error":"nothing to update"})

    # Verify imageKey nếu có
    if new_key:
        try:
            s3.head_object(Bucket=BUCKET, Key=new_key)
        except Exception:
            return _resp(400, {"error": f"imageKey not found in S3: {new_key}"})

    # Validate visibility
    if visibility is not None:
        v = (visibility or "").lower()
        if v not in ("public","private"):
            return _resp(400, {"error":"visibility must be public|private"})
        visibility = v

    # Validate tags
    if tags is not None:
        if not isinstance(tags, list):
            return _resp(400, {"error":"tags must be an array of strings"})
        tags = list({str(t).strip() for t in tags if str(t).strip()})

    # Validate & prepare geo updates
    recompute_geo = False
    if lat_raw is not None or lng_raw is not None:
        # nếu một trong hai có mặt, yêu cầu cả hai (để tránh nửa vời)
        if lat_raw is None or lng_raw is None:
            return _resp(400, {"error":"both lat and lng must be provided together"})
        try:
            lat_f = float(lat_raw)
            lng_f = float(lng_raw)
        except Exception:
            return _resp(400, {"error":"lat/lng must be numbers"})
        if not (-90.0 <= lat_f <= 90.0 and -180.0 <= lng_f <= 180.0):
            return _resp(400, {"error":"lat/lng out of range"})
        geoh = geohash_encode(lat_f, lng_f, precision=9)
        gh5  = geoh[:5]
        recompute_geo = True

    # Build UpdateExpression
    expr, names, values = [], {}, {}

    if title is not None:
        names["#t"] = "title"; values[":t"] = title; expr.append("#t = :t")
    if content is not None:
        names["#c"] = "content"; values[":c"] = content; expr.append("#c = :c")
    if new_key is not None:
        names["#ik"] = "imageKey"; values[":ik"] = new_key; expr.append("#ik = :ik")
        # thumbnailKey kèm theo
        names["#tk"] = "thumbnailKey"; values[":tk"] = _thumb_from_image_key(new_key); expr.append("#tk = :tk")
    if tags is not None:
        names["#tags"] = "tags"; values[":tags"] = tags; expr.append("#tags = :tags")
    if visibility is not None:
        # Nếu đổi sang private mà item CHƯA có ownerId -> yêu cầu user và set ownerId
        if visibility == "private" and not old.get("ownerId"):
            if not user:
                return _resp(401, {"error":"X-User-Id required to set private"})
            names["#owner"] = "ownerId"; values[":owner"] = user; expr.append("#owner = :owner")
        names["#v"] = "visibility"; values[":v"] = visibility; expr.append("#v = :v")

    if recompute_geo:
        names["#lat"] = "lat"; values[":lat"] = Decimal(str(lat_f)); expr.append("#lat = :lat")
        names["#lng"] = "lng"; values[":lng"] = Decimal(str(lng_f)); expr.append("#lng = :lng")
        names["#gh"]  = "geohash"; values[":gh"] = geoh; expr.append("#gh = :gh")
        names["#gh5"] = "gh5"; values[":gh5"] = gh5; expr.append("#gh5 = :gh5")

    # updatedAt
    names["#ud"] = "updatedAt"; values[":ud"] = datetime.now(timezone.utc).isoformat(); expr.append("#ud = :ud")

    updated = table.update_item(
        Key={"articleId": article_id},
        UpdateExpression="SET " + ", ".join(expr),
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=values,
        ReturnValues="ALL_NEW",
    )["Attributes"]

    # Nếu thay ảnh và delete_old=True → xóa ảnh cũ (không làm fail nếu lỗi)
    if new_key and delete_old:
        old_key = old.get("imageKey")
        if old_key and old_key != new_key:
            try:
                s3.delete_object(Bucket=BUCKET, Key=old_key)
            except Exception:
                pass

    # Convert Decimal -> float cho lat/lng nếu có
    if "lat" in updated and isinstance(updated["lat"], (int, float)) is False:
        try: updated["lat"] = float(updated["lat"])
        except: pass
    if "lng" in updated and isinstance(updated["lng"], (int, float)) is False:
        try: updated["lng"] = float(updated["lng"])
        except: pass

    return _resp(200, updated)
