import os, io, boto3
from PIL import Image

s3 = boto3.client("s3")
BUCKET = os.environ["BUCKET_NAME"]
THUMB_SIZE = 256

def _thumb_key_from_image_key(image_key: str) -> str:
    base = os.path.basename(image_key)
    stem = os.path.splitext(base)[0]
    return f"thumbnails/{stem}_{THUMB_SIZE}.webp"

def lambda_handler(event, ctx):
    for rec in event.get("Records", []):
        bucket = rec["s3"]["bucket"]["name"]
        key = rec["s3"]["object"]["key"]

        if bucket != BUCKET:
            continue
        # chỉ tạo thumb cho object dưới 'articles/'
        if not key.startswith("articles/"):
            continue
        if key.startswith("thumbnails/"):
            continue  # an toàn

        # tải ảnh gốc
        obj = s3.get_object(Bucket=bucket, Key=key)
        raw = obj["Body"].read()

        # tạo thumbnail (giữ tỉ lệ, tối đa 256)
        im = Image.open(io.BytesIO(raw)).convert("RGB")
        im.thumbnail((THUMB_SIZE, THUMB_SIZE))
        out = io.BytesIO()
        im.save(out, format="WEBP", quality=80, method=6)
        out.seek(0)

        # ghi lên S3
        thumb_key = _thumb_key_from_image_key(key)
        s3.put_object(
            Bucket=bucket,
            Key=thumb_key,
            Body=out.getvalue(),
            ContentType="image/webp",
            ACL="private"
        )

    return {"ok": True}
