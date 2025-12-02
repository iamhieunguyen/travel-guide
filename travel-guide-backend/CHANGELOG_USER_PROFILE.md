# Changelog - User Profile Management Feature

## 🎯 Tính năng mới

Thêm khả năng quản lý profile người dùng bao gồm:
- ✅ Xem profile
- ✅ Cập nhật username
- ✅ Cập nhật bio (giới thiệu)
- ✅ Upload và cập nhật avatar
- ✅ Thay đổi mật khẩu

---

## 📁 Files mới được tạo

### Lambda Functions
1. **`functions/auth/get_profile.py`**
   - Handler: `get_profile.lambda_handler`
   - Endpoint: `GET /profile`
   - Lấy thông tin profile của user hiện tại
   - Tự động tạo presigned URL cho avatar

2. **`functions/auth/update_profile.py`**
   - Handler: `update_profile.lambda_handler`
   - Endpoint: `PATCH /profile`
   - Cập nhật username, bio, avatarKey
   - Đồng bộ username với Cognito

3. **`functions/auth/get_avatar_upload_url.py`**
   - Handler: `get_avatar_upload_url.lambda_handler`
   - Endpoint: `POST /profile/avatar-upload-url`
   - Tạo presigned URL để upload avatar lên S3

4. **`functions/auth/change_password.py`**
   - Handler: `change_password.lambda_handler`
   - Endpoint: `POST /auth/change-password`
   - Thay đổi mật khẩu qua Cognito

### Documentation
5. **`USER_PROFILE_API.md`**
   - Tài liệu chi tiết về API
   - Examples và testing guide

6. **`scripts/test_profile_api.py`**
   - Script Python để test API locally
   - Hỗ trợ testing nhanh các endpoints

---

## 🔧 Files được cập nhật

### `template.yaml`
**Thêm Resources:**
- `UserProfilesTable` - DynamoDB table mới để lưu profile
- `GetProfileFunction` - Lambda function
- `UpdateProfileFunction` - Lambda function
- `GetAvatarUploadUrlFunction` - Lambda function
- `ChangePasswordFunction` - Lambda function

**Cập nhật CloudFront:**
- Thêm cache behavior cho `avatars/*` path

**Thêm Outputs:**
- `UserProfilesTableName` - Tên bảng profiles

---

## 🗄️ Database Schema

### UserProfilesTable (DynamoDB)

```
Primary Key: userId (String)

Attributes:
- userId: String (PK) - Cognito sub
- username: String - Tên hiển thị
- bio: String - Giới thiệu (max 500 chars)
- avatarKey: String - S3 key của avatar
- createdAt: String - ISO timestamp
- updatedAt: String - ISO timestamp
```

---

## 📦 S3 Structure

```
bucket-name/
├── articles/          # Ảnh bài viết (existing)
├── thumbnails/        # Thumbnails (existing)
└── avatars/           # NEW: Avatar của users
    └── {userId}/
        └── {uuid}.{ext}
```

---

## 🔐 IAM Permissions

### GetProfileFunction
- `dynamodb:GetItem` on UserProfilesTable
- `s3:GetObject` on ArticleImagesBucket (for presigned URLs)

### UpdateProfileFunction
- `dynamodb:PutItem`, `dynamodb:UpdateItem` on UserProfilesTable
- `cognito-idp:AdminUpdateUserAttributes` on UserPool

### GetAvatarUploadUrlFunction
- `s3:PutObject` on ArticleImagesBucket (for presigned URLs)

### ChangePasswordFunction
- `cognito-idp:ChangePassword` (global)

---

## 🚀 Deployment Steps

### 1. Build và Deploy
```bash
cd travel-guide-backend
sam build
sam deploy
```

### 2. Lấy API URL
```bash
aws cloudformation describe-stacks \
  --stack-name your-stack-name \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text
```

### 3. Test API
```bash
# Sử dụng script test
python scripts/test_profile_api.py

# Hoặc test thủ công với curl
curl -X GET https://your-api-url/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔄 Migration Notes

### Existing Users
- Users hiện tại sẽ không có profile trong UserProfilesTable
- Khi gọi `GET /profile` lần đầu, sẽ trả về profile rỗng
- User cần gọi `PATCH /profile` để tạo profile

### Backward Compatibility
- Không ảnh hưởng đến các API hiện tại
- Articles vẫn lưu `username` từ Cognito token
- Profile là optional feature

---

## 🧪 Testing Checklist

- [ ] Register user mới
- [ ] Login và lấy token
- [ ] GET /profile (lần đầu - empty)
- [ ] PATCH /profile với username và bio
- [ ] POST /profile/avatar-upload-url
- [ ] Upload avatar lên S3 bằng presigned URL
- [ ] PATCH /profile với avatarKey
- [ ] GET /profile (verify avatar URL)
- [ ] POST /auth/change-password
- [ ] Login lại với password mới

---

## 📊 API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/profile` | ✅ | Lấy profile hiện tại |
| PATCH | `/profile` | ✅ | Cập nhật profile |
| POST | `/profile/avatar-upload-url` | ✅ | Lấy URL upload avatar |
| POST | `/auth/change-password` | ✅ | Đổi mật khẩu |

---

## 🐛 Known Issues / Limitations

1. **Avatar Size Limit:**
   - Presigned URL có timeout 15 phút
   - Nên validate file size ở frontend trước khi upload

2. **Username Uniqueness:**
   - Hiện tại không enforce unique username
   - Có thể thêm GSI nếu cần tìm kiếm theo username

3. **Avatar Cleanup:**
   - Khi user upload avatar mới, avatar cũ không tự động xóa
   - Có thể thêm Lambda để cleanup sau

---

## 🔮 Future Enhancements

1. **Avatar Processing:**
   - Tự động resize avatar về kích thước chuẩn
   - Tạo thumbnail cho avatar
   - Validate image content

2. **Username Search:**
   - Thêm GSI để search users theo username
   - API để tìm kiếm users

3. **Profile Visibility:**
   - Public/private profile settings
   - Follow/follower system

4. **Email Change:**
   - API để thay đổi email
   - Email verification flow

---

## 📞 Support

Nếu có vấn đề, check:
1. CloudWatch Logs của từng Lambda function
2. DynamoDB table có được tạo đúng không
3. IAM permissions đã đủ chưa
4. Cognito token còn valid không

---

**Version:** 1.0.0  
**Date:** 2024-12-02  
**Author:** Travel Guide Team
