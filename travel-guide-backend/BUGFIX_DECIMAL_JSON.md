# 🐛 Bugfix: Decimal JSON Serialization Error

## ❌ Vấn đề:
```
Error: Object of type Decimal is not JSON serializable
500 Internal Server Error
```

## 🔍 Nguyên nhân:
- DynamoDB lưu số dưới dạng `Decimal` (từ boto3)
- Khi thêm `favoriteCount = 0` (int), DynamoDB vẫn có thể trả về dưới dạng `Decimal(0)`
- JSON encoder không thể serialize `Decimal` → lỗi 500

## ✅ Giải pháp:
Convert tất cả `Decimal` sang `int` hoặc `float` trước khi trả về JSON:

```python
# ❌ SAI - Chỉ convert lat/lng
if 'lat' in item:
    item['lat'] = float(item['lat'])

# ✅ ĐÚNG - Convert tất cả Decimal fields
for k, v in item.items():
    if isinstance(v, Decimal):
        # Số nguyên → int, số thập phân → float
        processed[k] = int(v) if v % 1 == 0 else float(v)
```

## 📝 Files đã sửa:
1. ✅ `create_article.py` - Convert response
2. ✅ `list_articles.py` - Convert items list
3. ✅ `search_article.py` - Update `_convert_decimal()`
4. ✅ `get_article.py` - Convert single item
5. ✅ `list_favorite_articles.py` - Update `_convert_decimal()`
6. ✅ `update_article.py` - Đã có logic đúng

## 🚀 Deploy:
```bash
cd travel-guide-backend
python -m samcli build --use-container
python -m samcli deploy
```

## ✨ Kết quả:
- ✅ Không còn lỗi JSON serialization
- ✅ `favoriteCount` hiển thị đúng dưới dạng `int`
- ✅ `lat/lng` hiển thị đúng dưới dạng `float`
- ✅ Tất cả endpoints hoạt động bình thường
