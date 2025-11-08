import os, json, base64, boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal
from utils.geo import parse_bbox, in_bbox  # <-- dùng từ CommonLayer

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])

def _resp(c, b):
    return {"statusCode": c, "headers": {"Content-Type":"application/json","Access-Control-Allow-Origin":"*"},
            "body": json.dumps(b, ensure_ascii=False)}

def _get_user_id(event):
    h = event.get("headers") or {}
    return h.get("X-User-Id") or h.get("x-user-id")

def _encode_token(d): return base64.urlsafe_b64encode(json.dumps(d).encode()).decode()
def _decode_token(tok):
    try: return json.loads(base64.urlsafe_b64decode(tok.encode()).decode())
    except: return None

def _match_kw(it, kw):
    if not kw: return True
    kw = kw.lower()
    return (kw in (it.get("title","").lower())) or (kw in (it.get("content","").lower()))

def _match_tags(it, req_any:set):
    if not req_any: return True
    tags = it.get("tags") or []
    if isinstance(tags, list):
        tagset = {str(t).strip().lower() for t in tags if str(t).strip()}
    else:
        tagset = {str(tags).strip().lower()} if tags else set()
    return bool(tagset.intersection(req_any))

def lambda_handler(event, ctx):
    p = event.get("queryStringParameters") or {}
    scope = (p.get("scope") or "public").lower()
    bbox_str = p.get("bbox")
    q = (p.get("q") or "").strip()
    tags_q = (p.get("tags") or "").strip()
    limit = int(p.get("limit",10))
    if limit<=0 or limit>100: limit=10

    # dùng utils.geo
    bbox = parse_bbox(bbox_str or "")
    if not bbox:
        return _resp(400, {"error":"bbox must be 'minLng,minLat,maxLng,maxLat'"})
    min_lng, min_lat, max_lng, max_lat = bbox

    req_tags = [t.strip().lower() for t in tags_q.split(",") if t.strip()] if tags_q else []

    eks=None
    if "nextToken" in p:
        eks=_decode_token(p["nextToken"])
        if eks is None: return _resp(400, {"error":"invalid nextToken"})

    if scope=="public":
        index="gsi_visibility_createdAt"; keycond=Key("visibility").eq("public")
    elif scope=="mine":
        user=_get_user_id(event)
        if not user: return _resp(401, {"error":"X-User-Id header required for scope=mine"})
        index="gsi_owner_createdAt"; keycond=Key("ownerId").eq(user)
    else:
        return _resp(400, {"error":"scope must be public|mine"})

    qargs={"IndexName":index,"KeyConditionExpression":keycond,
           "Limit":min(200, max(50, limit*5)), "ScanIndexForward":False}
    if eks: qargs["ExclusiveStartKey"]=eks

    data = table.query(**qargs)

    out=[]
    for it in data.get("Items",[]):
        if not in_bbox({"lat": it.get("lat"), "lng": it.get("lng")}, min_lng, min_lat, max_lng, max_lat):
            continue
        if not _match_kw(it, q): continue
        if not _match_tags(it, set(req_tags)): continue
        if "lat" in it and isinstance(it["lat"], Decimal): it["lat"] = float(it["lat"])
        if "lng" in it and isinstance(it["lng"], Decimal): it["lng"] = float(it["lng"])
        out.append(it)
        if len(out) >= limit: break

    next_token = _encode_token(data["LastEvaluatedKey"]) if len(out)<limit and "LastEvaluatedKey" in data else None
    return _resp(200, {"items": out, "nextToken": next_token})
