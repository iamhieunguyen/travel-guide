# Profile API - Frontend Integration

## 📁 Files đã thêm

```
src/
├── services/
│   └── profileService.js    ✨ Service để gọi Profile API
└── hook/
    └── useProfile.js        ✨ React Hook để quản lý profile
```

---

## 🚀 Quick Start

### Sử dụng Hook (Khuyến nghị)

```javascript
import useProfile from '../hook/useProfile';

function ProfilePage() {
  const { 
    profile,        // Profile data
    loading,        // Loading state
    error,          // Error message
    uploading,      // Avatar uploading state
    updateProfile,  // Update profile function
    uploadAvatar,   // Upload avatar function
    changePassword  // Change password function
  } = useProfile();

  // Profile tự động load khi component mount
  
  return (
    <div>
      <img src={profile?.avatarUrl || '/default-avatar.png'} />
      <h2>{profile?.username}</h2>
      <p>{profile?.bio}</p>
    </div>
  );
}
```

---

## 📚 API Methods

### 1. Get Profile
```javascript
const profile = await profileService.getProfile();
```

### 2. Update Profile
```javascript
await profileService.updateProfile({
  username: 'new_username',
  bio: 'My bio'
});
```

### 3. Upload Avatar
```javascript
const file = event.target.files[0];
await profileService.uploadAvatar(file);
```

### 4. Change Password
```javascript
await profileService.changePassword('oldPassword', 'newPassword');
```

---

## 🎯 Backend Endpoints

- `GET /profile` - Lấy profile
- `PATCH /profile` - Cập nhật profile
- `POST /profile/avatar-upload-url` - Lấy URL upload avatar
- `POST /auth/change-password` - Đổi mật khẩu

---

## ⚙️ Configuration

Đảm bảo `.env` có API URL:

```env
REACT_APP_API_GATEWAY_URL=https://your-api-id.execute-api.region.amazonaws.com/Prod
```

---

**Ready to use! 🎉**
