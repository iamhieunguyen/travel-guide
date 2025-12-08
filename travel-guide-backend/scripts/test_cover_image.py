#!/usr/bin/env python3
"""
Script test tính năng Cover Image (Python version)
Sử dụng: python test_cover_image.py <API_URL> <AUTH_TOKEN> <IMAGE_FILE>
"""

import sys
import json
import requests
from pathlib import Path

def test_cover_image(api_url, auth_token, image_file):
    """Test cover image upload flow"""
    
    # Validate inputs
    if not Path(image_file).exists():
        print(f"❌ Error: Image file not found: {image_file}")
        return False
    
    # Get content type
    ext = Path(image_file).suffix.lower()
    content_type_map = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp'
    }
    
    content_type = content_type_map.get(ext)
    if not content_type:
        print(f"❌ Error: Unsupported file type: {ext}")
        return False
    
    headers = {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }
    
    print("=" * 50)
    print("Testing Cover Image Feature")
    print("=" * 50)
    print()
    
    # Step 1: Get upload URL
    print("Step 1: Getting upload URL...")
    try:
        response = requests.post(
            f"{api_url}/profile/cover-upload-url",
            headers=headers,
            json={
                'filename': Path(image_file).name,
                'contentType': content_type
            }
        )
        response.raise_for_status()
        upload_data = response.json()
        print(f"✅ Response: {json.dumps(upload_data, indent=2)}")
        print()
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    upload_url = upload_data.get('uploadUrl')
    cover_key = upload_data.get('coverImageKey')
    
    if not upload_url or not cover_key:
        print("❌ Error: Missing uploadUrl or coverImageKey")
        return False
    
    # Step 2: Upload image
    print("Step 2: Uploading image to S3...")
    try:
        with open(image_file, 'rb') as f:
            response = requests.put(
                upload_url,
                data=f,
                headers={'Content-Type': content_type}
            )
        response.raise_for_status()
        print(f"✅ Upload successful (HTTP {response.status_code})")
        print()
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Step 3: Update profile
    print("Step 3: Updating profile with cover image key...")
    try:
        response = requests.patch(
            f"{api_url}/profile",
            headers=headers,
            json={'coverImageKey': cover_key}
        )
        response.raise_for_status()
        update_data = response.json()
        print(f"✅ Response: {json.dumps(update_data, indent=2)}")
        print()
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Step 4: Get profile to verify
    print("Step 4: Getting profile to verify...")
    try:
        response = requests.get(
            f"{api_url}/profile",
            headers=headers
        )
        response.raise_for_status()
        profile_data = response.json()
        print(f"✅ Profile: {json.dumps(profile_data, indent=2)}")
        print()
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Verify cover image
    if 'coverImageUrl' in profile_data and profile_data['coverImageUrl']:
        print("=" * 50)
        print("✅ SUCCESS! Cover image uploaded successfully!")
        print("=" * 50)
        print()
        print(f"Cover Image URL: {profile_data['coverImageUrl']}")
        print()
        print("You can view the image at the URL above (valid for 1 hour)")
        return True
    else:
        print("=" * 50)
        print("❌ FAILED! Cover image not found in profile")
        print("=" * 50)
        return False

def main():
    if len(sys.argv) != 4:
        print("Usage: python test_cover_image.py <API_URL> <AUTH_TOKEN> <IMAGE_FILE>")
        print("Example: python test_cover_image.py https://xxx.execute-api.us-east-1.amazonaws.com/Prod eyJxxx... cover.jpg")
        sys.exit(1)
    
    api_url = sys.argv[1].rstrip('/')
    auth_token = sys.argv[2]
    image_file = sys.argv[3]
    
    success = test_cover_image(api_url, auth_token, image_file)
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
