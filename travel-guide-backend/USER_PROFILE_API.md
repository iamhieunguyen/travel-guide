# User Profile Management API

## 📋 Tổng quan

API quản lý profile người dùng bao gồm:
- Xem profile
- Cập nhật username, bio, avatar
- Thay đổi mật khẩu

## 🔐 Authentication

Tất cả các endpoints đều yêu cầu JWT token từ Cognito trong header:
```
Authorization: Bearer <id_token>
```

## 📡 API Endpoints

### 1. Get Profile
Lấy thông tin profile của user hiện tại

**Endpoint:** `GET /profile`

**Headers:**
```
Authorization: Bearer <id_token>
```

**Response 200:**
```json
{
  "userId": "uuid-string",
  "username": "john_doe",
  "avatarKey": "avatars/user-id/uuid.jpg",
  "avatarUrl": "https://presigned-url...",
  "bio": "Travel enthusiast from Vietnam",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-02T00:00:00Z"
}
```

---

### 2. Update Profile
Cập nhật thông tin profile (username, bio, avatar)

**Endpoint:** `PATCH /profile`

**Headers:**
```
Authorization: Bearer <id_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "new_username",
  "bio": "Updated bio text",
  "avatarKey": "avatars/user-id/new-avatar.jpg"
}
```

**Validation:**
- `username`: 3-30 ký tự
- `bio`: Tối đa 500 ký tự
- `avatarKey`: Phải là key hợp lệ trong S3

**Response 200:**
```json
{
  "message": "Profile updated successfully",
  "profile": {
    "userId": "uuid-string",
    "username": "new_username",
    "bio": "Updated bio text",
    "avatarKey": "avatars/user-id/new-avatar.jpg",
    "updatedAt": "2024-01-02T00:00:00Z"
  }
}
```

---

### 3. Get Avatar Upload URL
Lấy presigned URL để upload avatar

**Endpoint:** `POST /profile/avatar-upload-url`

**Headers:**
```
Authorization: Bearer <id_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "filename": "avatar.jpg",
  "contentType": "image/jpeg"
}
```

**Allowed Content Types:**
- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/webp`

**Response 200:**
```json
{
  "uploadUrl": "https://s3-presigned-url...",
  "avatarKey": "avatars/user-id/uuid.jpg",
  "expiresIn": 900
}
```

**Upload Flow:**
1. Gọi API này để lấy `uploadUrl` và `avatarKey`
2. Upload file lên S3 bằng PUT request:
   ```javascript
   fetch(uploadUrl, {
     method: 'PUT',
     body: fileBlob,
     headers: {
       'Content-Type': contentType
     }
   })
   ```
3. Sau khi upload thành công, gọi `PATCH /profile` với `avatarKey` để cập nhật profile

---

### 4. Change Password
Thay đổi mật khẩu

**Endpoint:** `POST /auth/change-password`

**Headers:**
```
Authorization: Bearer <id_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "oldPassword": "current_password",
  "newPassword": "new_password_123"
}
```

**Validation:**
- `newPassword`: Tối thiểu 8 ký tự
- Phải tuân thủ password policy của Cognito (uppercase, lowercase, number)

**Response 200:**
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `400`: Mật khẩu cũ không đúng
- `400`: Mật khẩu mới không hợp lệ
- `429`: Quá nhiều request

---

## 🖼️ Avatar Upload Flow (Complete Example)

### Frontend Code Example:

```javascript
// 1. Lấy upload URL
async function uploadAvatar(file) {
  // Step 1: Get presigned URL
  const urlResponse = await fetch('https://api.example.com/profile/avatar-upload-url', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type
    })
  });
  
  const { uploadUrl, avatarKey } = await urlResponse.json();
  
  // Step 2: Upload file to S3
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  });
  
  // Step 3: Update profile with new avatar key
  const profileResponse = await fetch('https://api.example.com/profile', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      avatarKey: avatarKey
    })
  });
  
  return await profileResponse.json();
}
```

---

## 🗄️ Database Schema

### UserProfilesTable (DynamoDB)

**Primary Key:**
- `userId` (String) - Partition Key

**Attributes:**
- `username` (String) - Tên hiển thị
- `bio` (String) - Giới thiệu bản thân
- `avatarKey` (String) - S3 key của avatar
- `createdAt` (String) - ISO timestamp
- `updatedAt` (String) - ISO timestamp

---

## 🔒 Security Notes

1. **Avatar Upload:**
   - Presigned URL có thời hạn 15 phút
   - Chỉ cho phép upload vào thư mục `avatars/{userId}/`
   - Validate content type trước khi tạo URL

2. **Username Update:**
   - Cập nhật cả trong DynamoDB và Cognito
   - Validate độ dài và ký tự hợp lệ

3. **Password Change:**
   - Yêu cầu mật khẩu cũ để xác thực
   - Tuân thủ password policy của Cognito
   - Rate limiting để tránh brute force

---

## 📝 Testing với curl

### Get Profile
```bash
curl -X GET https://api.example.com/profile \
  -H "Authorization: Bearer YOUR_ID_TOKEN"
```

### Update Profile
```bash
curl -X PATCH https://api.example.com/profile \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "new_username",
    "bio": "My new bio"
  }'
```

### Change Password
```bash
curl -X POST https://api.example.com/auth/change-password \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "OldPass123",
    "newPassword": "NewPass123"
  }'
```

---

## 🚀 Deployment

Sau khi cập nhật code, deploy bằng SAM:

```bash
cd travel-guide-backend
sam build
sam deploy
```

Lấy API URL từ outputs:
```bash
aws cloudformation describe-stacks \
  --stack-name your-stack-name \
  --query 'Stacks[0].Outputs'
```
