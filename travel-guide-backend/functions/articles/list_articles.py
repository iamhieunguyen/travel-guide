import os, json, base64, boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])

def _resp(code, body): 
    return {"statusCode":code,"headers":{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"},"body":json.dumps(body,ensure_ascii=False)}

def _encode(d): return base64.urlsafe_b64encode(json.dumps(d).encode()).decode()
def _decode(s):
    try: return json.loads(base64.urlsafe_b64decode(s.encode()).decode())
    except: return None

def _get_user_id(event):
    h = event.get("headers") or {}
    return h.get("X-User-Id") or h.get("x-user-id")

def lambda_handler(event, ctx):
    qs = event.get("queryStringParameters") or {}
    scope = (qs.get("scope") or "public").lower()   # public | mine
    limit = int(qs.get("limit", 10))
    if limit<=0 or limit>100: limit=10
    nt = _decode(qs["nextToken"]) if qs.get("nextToken") else None

    if scope not in ("public","mine"):
        return _resp(400, {"error":"scope must be public|mine"})

    if scope == "public":
        params = {
            "IndexName":"gsi_visibility_createdAt",
            "KeyConditionExpression": Key("visibility").eq("public"),
            "ScanIndexForward": False,  # mới nhất trước
            "Limit": limit
        }
    else:  # mine
        user = _get_user_id(event)
        if not user: 
            return _resp(401, {"error":"missing X-User-Id for scope=mine"})
        params = {
            "IndexName":"gsi_owner_createdAt",
            "KeyConditionExpression": Key("ownerId").eq(user),
            "ScanIndexForward": False,
            "Limit": limit
        }

    if nt: params["ExclusiveStartKey"]=nt
    rs = table.query(**params)
    items = rs.get("Items", [])
    next_token = _encode(rs["LastEvaluatedKey"]) if "LastEvaluatedKey" in rs else None
    return _resp(200, {"items":items,"nextToken":next_token})
