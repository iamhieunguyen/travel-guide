#!/bin/bash

# Script test tính năng Cover Image
# Sử dụng: ./test_cover_image.sh <API_URL> <AUTH_TOKEN> <IMAGE_FILE>

set -e

API_URL=$1
AUTH_TOKEN=$2
IMAGE_FILE=$3

if [ -z "$API_URL" ] || [ -z "$AUTH_TOKEN" ] || [ -z "$IMAGE_FILE" ]; then
    echo "Usage: ./test_cover_image.sh <API_URL> <AUTH_TOKEN> <IMAGE_FILE>"
    echo "Example: ./test_cover_image.sh https://xxx.execute-api.us-east-1.amazonaws.com/Prod eyJxxx... cover.jpg"
    exit 1
fi

if [ ! -f "$IMAGE_FILE" ]; then
    echo "Error: Image file not found: $IMAGE_FILE"
    exit 1
fi

echo "========================================="
echo "Testing Cover Image Feature"
echo "========================================="
echo ""

# Lấy content type từ file extension
EXT="${IMAGE_FILE##*.}"
case "$EXT" in
    jpg|jpeg)
        CONTENT_TYPE="image/jpeg"
        ;;
    png)
        CONTENT_TYPE="image/png"
        ;;
    webp)
        CONTENT_TYPE="image/webp"
        ;;
    *)
        echo "Error: Unsupported file type: $EXT"
        exit 1
        ;;
esac

echo "Step 1: Getting upload URL..."
UPLOAD_RESPONSE=$(curl -s -X POST "${API_URL}/profile/cover-upload-url" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"filename\": \"$(basename $IMAGE_FILE)\", \"contentType\": \"${CONTENT_TYPE}\"}")

echo "Response: $UPLOAD_RESPONSE"
echo ""

UPLOAD_URL=$(echo $UPLOAD_RESPONSE | grep -o '"uploadUrl":"[^"]*' | cut -d'"' -f4)
COVER_KEY=$(echo $UPLOAD_RESPONSE | grep -o '"coverImageKey":"[^"]*' | cut -d'"' -f4)

if [ -z "$UPLOAD_URL" ]; then
    echo "Error: Failed to get upload URL"
    echo "Response: $UPLOAD_RESPONSE"
    exit 1
fi

echo "Upload URL: $UPLOAD_URL"
echo "Cover Key: $COVER_KEY"
echo ""

echo "Step 2: Uploading image to S3..."
curl -X PUT "$UPLOAD_URL" \
    -H "Content-Type: ${CONTENT_TYPE}" \
    --data-binary "@${IMAGE_FILE}" \
    -w "\nHTTP Status: %{http_code}\n"
echo ""

echo "Step 3: Updating profile with cover image key..."
UPDATE_RESPONSE=$(curl -s -X PATCH "${API_URL}/profile" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"coverImageKey\": \"${COVER_KEY}\"}")

echo "Response: $UPDATE_RESPONSE"
echo ""

echo "Step 4: Getting profile to verify..."
PROFILE_RESPONSE=$(curl -s -X GET "${API_URL}/profile" \
    -H "Authorization: Bearer ${AUTH_TOKEN}")

echo "Profile Response: $PROFILE_RESPONSE"
echo ""

# Kiểm tra xem coverImageUrl có tồn tại không
if echo "$PROFILE_RESPONSE" | grep -q "coverImageUrl"; then
    echo "========================================="
    echo "✅ SUCCESS! Cover image uploaded successfully!"
    echo "========================================="
    
    COVER_URL=$(echo $PROFILE_RESPONSE | grep -o '"coverImageUrl":"[^"]*' | cut -d'"' -f4)
    echo ""
    echo "Cover Image URL: $COVER_URL"
    echo ""
    echo "You can view the image at the URL above (valid for 1 hour)"
else
    echo "========================================="
    echo "❌ FAILED! Cover image not found in profile"
    echo "========================================="
    exit 1
fi
