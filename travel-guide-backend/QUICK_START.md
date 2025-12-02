# 🚀 Quick Start - User Profile Feature

## 📋 Tính năng mới

✅ **GET /profile** - Xem profile  
✅ **PATCH /profile** - Cập nhật username, bio, avatar  
✅ **POST /profile/avatar-upload-url** - Lấy URL upload avatar  
✅ **POST /auth/change-password** - Đổi mật khẩu

## 🚀 Deploy to AWS

```powershell
cd travel-guide-backend

# Build với Docker (không cần Python 3.11 local)
python -m samcli build --use-container

# Deploy lần đầu
python -m samcli deploy --guided

# Deploy lần sau
python -m samcli deploy
```

## 📊 Get API URL

```powershell
aws cloudformation describe-stacks `
  --stack-name travel-guide-backend `
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' `
  --output text
```

## 📚 Documentation

- **USER_PROFILE_API.md** - API documentation chi tiết
- **USER_PROFILE_FLOW.md** - Flow diagrams & integration examples
- **DEPLOYMENT_GUIDE.md** - Hướng dẫn deploy đầy đủ
- **CHANGELOG_USER_PROFILE.md** - Changelog

## 🗄️ Database Changes

**New Table:** `UserProfilesTable`
- Primary Key: `userId`
- Attributes: `username`, `bio`, `avatarKey`, `createdAt`, `updatedAt`

## 📦 S3 Structure

```
bucket/
├── articles/      # Existing
├── thumbnails/    # Existing
└── avatars/       # NEW - User avatars
    └── {userId}/
```

## 🔐 Security

- Tất cả endpoints yêu cầu Cognito JWT token
- Avatar upload qua presigned URLs (15 phút timeout)
- Password change yêu cầu old password

## 💡 Testing Flow

1. Register user: `POST /auth/register`
2. Confirm email: `POST /auth/confirm`
3. Login: `POST /auth/login` → get `id_token`
4. Get profile: `GET /profile` (with token)
5. Update profile: `PATCH /profile` (with token)
6. Upload avatar:
   - Get URL: `POST /profile/avatar-upload-url`
   - Upload to S3: `PUT` to presigned URL
   - Update profile: `PATCH /profile` with `avatarKey`

---

**Happy Coding! 🎉**
