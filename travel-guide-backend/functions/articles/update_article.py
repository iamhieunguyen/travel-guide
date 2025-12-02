import os
import json
import base64
import boto3
import urllib.request
import urllib.parse
from decimal import Decimal
from cors import ok, error, options  # Giả định các hàm này đã được định nghĩa

# --- INITIALIZATION ---
dynamodb = boto3.resource("dynamodb")

TABLE_NAME = os.environ["TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]
table = dynamodb.Table(TABLE_NAME)

# --- CONSTANTS & HELPERS ---
MAX_IMAGES = 4  # Giới hạn số lượng ảnh tối đa


def _thumb_from_image_key(image_key: str) -> str:
    """Tạo thumbnailKey từ imageKey."""
    base = os.path.basename(image_key)
    stem = os.path.splitext(base)[0]
    return f"thumbnails/{stem}_256.webp"


def _get_user_id(event):
    """Lấy user ID từ context/headers."""
    rc = event.get("requestContext") or {}
    auth = rc.get("authorizer") or {}

    # REST API + Cognito User Pool Authorizer
    claims = auth.get("claims") or {}
    if claims:
        return claims.get("sub") or claims.get("cognito:username")

    # HTTP API + JWT Authorizer
    jwt = auth.get("jwt") or {}
    jwt_claims = jwt.get("claims") or {}
    if jwt_claims:
        return jwt_claims.get("sub") or jwt_claims.get("cognito:username")

    # Dev fallback
    headers = event.get("headers") or {}
    return headers.get("X-User-Id") or headers.get("x-user-id")


def _reverse_geocode(lat: float, lng: float) -> str | None:
    """
    Gọi Nominatim để lấy locationName (display_name) từ lat/lng.
    Dùng khi update lat/lng nhưng không truyền locationName.
    """
    try:
        base_url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            "format": "json",
            "lat": str(lat),
            "lon": str(lng),
            "zoom": "14",
            "addressdetails": "1",
            "accept-language": "vi",
        }
        url = f"{base_url}?{urllib.parse.urlencode(params)}"

        req = urllib.request.Request(
            url,
            headers={
                # ⚠️ Thay email thật của bạn
                "User-Agent": "travel-guide-app/1.0 (chaukiet2704@gmail.com)"
            },
        )

        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("display_name")
    except Exception as e:
        print(f"reverse_geocode(update) error for ({lat}, {lng}): {e}")
        return None


def lambda_handler(event, context):
    method = (event.get("httpMethod") or
              event.get("requestContext", {}).get("http", {}).get("method"))
    if method == "OPTIONS":
        return options()

    try:
        # 1. Lấy ID người dùng hiện tại
        current_user_id = _get_user_id(event)
        print("DEBUG current_user_id =", current_user_id)

        if not current_user_id:
            return error(401, "Unauthorized: User identity not found")

        # 2. Lấy articleId từ path
        path_params = event.get("pathParameters") or {}
        article_id = path_params.get("articleId")
        print("DEBUG article_id =", article_id)

        if not article_id:
            return error(400, "articleId is required")

        # 3. Lấy bài viết hiện tại để kiểm tra quyền
        current_item_response = table.get_item(Key={"articleId": article_id})
        print("DEBUG TABLE_NAME =", TABLE_NAME)
        print("DEBUG get_item response =", current_item_response)

        if "Item" not in current_item_response:
            return error(404, "Article not found")

        current_article = current_item_response["Item"]
        owner_id = current_article.get("ownerId")
        print("DEBUG db_owner_id =", owner_id)

        # 4. Kiểm tra quyền sở hữu
        if owner_id != current_user_id:
            return error(403, "Forbidden: You do not own this article")

        # 5. Parse body
        body_str = event.get("body") or ""
        if event.get("isBase64Encoded"):
            body_str = base64.b64decode(body_str).decode("utf-8", errors="ignore")
        print("DEBUG raw_body =", body_str)
        data = json.loads(body_str or "{}")
        print("DEBUG parsed_data =", data)

        # ----------------------------------------------------------------------
        # 🖼️ Logic Xử lý và Validate imageKeys (Mới)
        # ----------------------------------------------------------------------
        if "imageKeys" in data:
            raw_keys = data["imageKeys"]

            # 1. Check là array
            if not isinstance(raw_keys, list):
                return error(400, "imageKeys must be an array")

            # 2. Check không vượt quá MAX_IMAGES
            if len(raw_keys) > MAX_IMAGES:
                return error(400, f"Maximum {MAX_IMAGES} images allowed per article")

            # 3. Đồng bộ ảnh cover và thumbnail
            if raw_keys:
                cover_image_key = str(raw_keys[0]).strip()
                # Set imageKey cover và thumbnailKey vào data để đưa vào UpdateExpression
                data["imageKey"] = cover_image_key
                data["thumbnailKey"] = _thumb_from_image_key(cover_image_key)
            else:
                # Nếu mảng rỗng, set các trường liên quan thành None để DynamoDB xóa chúng (REMOVE)
                data["imageKey"] = None
                data["thumbnailKey"] = None

        # ----------------------------------------------------------------------
        # 🌍 Auto locationName khi update lat/lng mà không truyền locationName
        # ----------------------------------------------------------------------
        if "lat" in data and "lng" in data:
            try:
                lat_f = float(data["lat"])
                lng_f = float(data["lng"])
                if not (-90 <= lat_f <= 90 and -180 <= lng_f <= 180):
                    return error(400, "Invalid coordinates when updating lat/lng")

                # Chỉ auto-geocode nếu client không gửi locationName hoặc gửi chuỗi rỗng
                raw_loc = (data.get("locationName") or "").strip()
                if not raw_loc:
                    auto_loc = _reverse_geocode(lat_f, lng_f)
                    if auto_loc:
                        data["locationName"] = auto_loc.strip()
                        print("DEBUG auto locationName from lat/lng =", data["locationName"])
            except Exception as e:
                print("DEBUG error while auto reverse_geocode in update:", e)

        # ----------------------------------------------------------------------

        # Danh sách các trường được phép update, bao gồm các trường ảnh mới
        allowed_fields = [
            "title",
            "content",
            "visibility",
            "lat",
            "lng",
            "tags",
            "imageKey",
            "imageKeys",
            "thumbnailKey",
            "locationName",
        ]

        set_parts = []
        remove_fields = []
        expression_attribute_names = {}
        expression_attribute_values = {}

        # Xây dựng UpdateExpression
        for key, value in data.items():
            if key in allowed_fields:

                # 1. Xử lý trường cần xóa (khi giá trị là None/null)
                if value is None:
                    # Chỉ áp dụng cho các trường optional
                    if key in ["imageKey", "imageKeys", "thumbnailKey", "locationName"]:
                        remove_fields.append(key)
                        expression_attribute_names[f"#{key}"] = key
                        # Nếu xóa locationName thì cũng xóa locationNameLower
                        if key == "locationName":
                            remove_fields.append("locationNameLower")
                            expression_attribute_names["#locationNameLower"] = "locationNameLower"
                    continue

                # 2. Xử lý trường cần SET
                set_parts.append(f"#{key} = :{key}")
                expression_attribute_names[f"#{key}"] = key

                # Add lowercase fields for search
                if key == "title":
                    set_parts.append("#titleLower = :titleLower")
                    expression_attribute_names["#titleLower"] = "titleLower"
                    expression_attribute_values[":titleLower"] = value.lower()
                elif key == "content":
                    set_parts.append("#contentLower = :contentLower")
                    expression_attribute_names["#contentLower"] = "contentLower"
                    expression_attribute_values[":contentLower"] = value.lower()
                elif key == "locationName":
                    # Only add if not already added (avoid duplicates)
                    if "#locationNameLower" not in expression_attribute_names:
                        set_parts.append("#locationNameLower = :locationNameLower")
                        expression_attribute_names["#locationNameLower"] = "locationNameLower"
                        expression_attribute_values[":locationNameLower"] = str(value).lower()

                # Xử lý Decimal cho lat/lng
                if key in ["lat", "lng"]:
                    try:
                        value_decimal = Decimal(str(value))
                        # Basic validation cho tọa độ
                        if key == "lat" and not (-90 <= float(value) <= 90):
                            return error(400, "Invalid latitude")
                        if key == "lng" and not (-180 <= float(value) <= 180):
                            return error(400, "Invalid longitude")

                        expression_attribute_values[f":{key}"] = value_decimal
                    except Exception:
                        return error(400, f"Invalid value for {key}")
                else:
                    expression_attribute_values[f":{key}"] = value

        # Xử lý auto-update geohash/gh5 nếu lat/lng có trong data
        if all(k in data for k in ["lat", "lng"]):
            lat_f = float(data["lat"])
            lng_f = float(data["lng"])

            set_parts.append("#geohash = :geohash")
            set_parts.append("#gh5 = :gh5")

            expression_attribute_names["#geohash"] = "geohash"
            expression_attribute_values[":geohash"] = f"{lat_f:.6f},{lng_f:.6f}"

            expression_attribute_names["#gh5"] = "gh5"
            expression_attribute_values[":gh5"] = f"{lat_f:.2f},{lng_f:.2f}"

        # Kiểm tra xem có gì để update/remove không
        if not set_parts and not remove_fields:
            return error(400, "No valid fields to update")

        # Ghép UpdateExpression cuối cùng
        final_update_expression = ""
        if set_parts:
            final_update_expression += "SET " + ", ".join(set_parts)

        if remove_fields:
            if final_update_expression:
                final_update_expression += " "
            final_update_expression += "REMOVE " + ", ".join([f"#{f}" for f in remove_fields])

        print("DEBUG update_expression =", final_update_expression)
        print("DEBUG expr_attr_names =", expression_attribute_names)
        print("DEBUG expr_attr_values =", expression_attribute_values)

        # 6. Cập nhật bài viết
        response = table.update_item(
            Key={"articleId": article_id},
            UpdateExpression=final_update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="ALL_NEW",
        )

        print("DEBUG update_item result =", response)

        item = response["Attributes"]
        processed_item = {}
        for k, v in item.items():
            if isinstance(v, Decimal):
                # Xử lý chuyển Decimal về float/int cho JSON response
                processed_item[k] = float(v) if v % 1 != 0 else int(v)
            else:
                processed_item[k] = v

        return ok(200, processed_item)

    except json.JSONDecodeError:
        return error(400, "Invalid JSON in request body")
    except Exception as e:
        print(f"Error in update_article: {e}")
        return error(500, "Internal server error")
