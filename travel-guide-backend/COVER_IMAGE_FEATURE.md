# Tính năng Ảnh Bìa Người Dùng (Cover Image)

## 📋 Tổng quan
Tính năng này cho phép người dùng upload và quản lý ảnh bìa cho profile của họ, tương tự như ảnh bìa trên Facebook hoặc Twitter.

## 🎯 Các thay đổi đã thực hiện

### 1. API Endpoints mới
- **POST /profile/cover-upload-url** - Lấy presigned URL để upload ảnh bìa

### 2. Cập nhật API hiện có
- **GET /profile** - Trả về thêm `coverImageKey` và `coverImageUrl`
- **PATCH /profile** - Cho phép cập nhật `coverImageKey`

### 3. Cấu trúc S3
- Thêm folder `covers/` trong S3 bucket
- Format key: `covers/{userId}/{uuid}.{ext}`

### 4. CloudFront
- Thêm cache behavior cho `covers/*` để tối ưu hiệu suất

## 🚀 Cách sử dụng

### Bước 1: Lấy URL upload
```bash
POST /profile/cover-upload-url
Authorization: Bearer {token}
Content-Type: application/json

{
  "filename": "my-cover.jpg",
  "contentType": "image/jpeg"
}
```

**Response:**
```json
{
  "uploadUrl": "https://...",
  "coverImageKey": "covers/{userId}/{uuid}.jpg",
  "expiresIn": 900,
  "maxSizeBytes": 10485760
}
```

### Bước 2: Upload ảnh lên S3
```bash
PUT {uploadUrl}
Content-Type: image/jpeg

[Binary image data]
```

### Bước 3: Cập nhật profile với coverImageKey
```bash
PATCH /profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "coverImageKey": "covers/{userId}/{uuid}.jpg"
}
```

### Bước 4: Lấy thông tin profile (bao gồm cover image)
```bash
GET /profile
Authorization: Bearer {token}
```

**Response:**
```json
{
  "userId": "...",
  "username": "...",
  "avatarKey": "...",
  "avatarUrl": "https://...",
  "coverImageKey": "covers/{userId}/{uuid}.jpg",
  "coverImageUrl": "https://...",
  "bio": "...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

## 📐 Thông số kỹ thuật

### Giới hạn
- **Kích thước tối đa**: 10MB
- **Định dạng cho phép**: JPEG, JPG, PNG, WebP
- **Thời gian URL hợp lệ**: 15 phút (upload), 1 giờ (view)

### Khuyến nghị
- **Kích thước ảnh**: 1920x1080 hoặc 1200x400 pixels
- **Tỷ lệ khung hình**: 16:9 hoặc 3:1 (banner style)
- **Định dạng**: JPEG hoặc WebP để tối ưu dung lượng

## 🔧 Triển khai

### Deploy lên AWS
```bash
cd travel-guide-backend
sam build
sam deploy
```

### Kiểm tra endpoints
```bash
# Lấy API URL từ CloudFormation outputs
aws cloudformation describe-stacks \
  --stack-name {stack-name} \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text
```

## 📝 Lưu ý

1. **Xóa ảnh cũ**: Khi user upload ảnh bìa mới, nên xóa ảnh cũ trong S3 để tiết kiệm chi phí
2. **Validation**: Hiện tại chưa có validation kích thước ảnh, có thể thêm sau
3. **Thumbnail**: Có thể tạo thumbnail cho ảnh bìa để tối ưu hiệu suất
4. **Content Moderation**: Có thể tích hợp Rekognition để kiểm tra nội dung ảnh

## 🔐 Bảo mật

- Chỉ user đã đăng nhập mới có thể upload ảnh bìa
- Mỗi user chỉ có thể upload vào folder của mình (`covers/{userId}/`)
- Presigned URL có thời gian hết hạn
- CloudFront OAI đảm bảo chỉ CloudFront mới có thể đọc từ S3

## 🎨 Tích hợp Frontend

### React Example
```javascript
// 1. Lấy upload URL
const getUploadUrl = async (file) => {
  const response = await fetch(`${API_URL}/profile/cover-upload-url`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type
    })
  });
  return response.json();
};

// 2. Upload file
const uploadFile = async (uploadUrl, file) => {
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type
    },
    body: file
  });
};

// 3. Cập nhật profile
const updateProfile = async (coverImageKey) => {
  await fetch(`${API_URL}/profile`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ coverImageKey })
  });
};

// Sử dụng
const handleCoverUpload = async (file) => {
  const { uploadUrl, coverImageKey } = await getUploadUrl(file);
  await uploadFile(uploadUrl, file);
  await updateProfile(coverImageKey);
  // Reload profile để lấy coverImageUrl
};
```

## ✅ Checklist triển khai

- [x] Tạo Lambda function `GetCoverUploadUrlFunction`
- [x] Cập nhật `get_profile.py` để trả về cover image URL
- [x] Cập nhật `update_profile.py` để cho phép update coverImageKey
- [x] Thêm folder `covers/` vào S3
- [x] Thêm CloudFront cache behavior cho `covers/*`
- [x] Kiểm tra không có lỗi cú pháp
- [ ] Deploy lên AWS
- [ ] Test API endpoints
- [ ] Tích hợp vào frontend
