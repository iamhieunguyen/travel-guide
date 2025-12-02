# User Profile Management Flow

## 🔄 Complete User Profile Flow

### 1️⃣ Get Profile Flow
```
Frontend                Lambda                  DynamoDB              S3
   |                      |                        |                  |
   |--GET /profile------->|                        |                  |
   |  (with JWT token)    |                        |                  |
   |                      |                        |                  |
   |                      |--GetItem(userId)------>|                  |
   |                      |<-Profile data----------|                  |
   |                      |                        |                  |
   |                      |--Generate presigned--->|                  |
   |                      |  URL for avatar        |                  |
   |                      |                        |                  |
   |<-Profile + avatarUrl-|                        |                  |
   |                      |                        |                  |
```

### 2️⃣ Update Profile Flow (Username & Bio)
```
Frontend                Lambda                  DynamoDB            Cognito
   |                      |                        |                  |
   |--PATCH /profile----->|                        |                  |
   |  {username, bio}     |                        |                  |
   |                      |                        |                  |
   |                      |--Validate data-------->|                  |
   |                      |                        |                  |
   |                      |--UpdateUserAttributes->|                  |
   |                      |  (sync username)       |                  |
   |                      |<-Success---------------|                  |
   |                      |                        |                  |
   |                      |--UpdateItem----------->|                  |
   |                      |<-Updated profile-------|                  |
   |                      |                        |                  |
   |<-Success + profile---|                        |                  |
   |                      |                        |                  |
```

### 3️⃣ Avatar Upload Flow (Complete)
```
Frontend                Lambda                  S3                 DynamoDB
   |                      |                      |                    |
   |--POST /avatar-url--->|                      |                    |
   |  {filename, type}    |                      |                    |
   |                      |                      |                    |
   |                      |--Generate presigned->|                    |
   |                      |  PUT URL             |                    |
   |                      |                      |                    |
   |<-uploadUrl+key-------|                      |                    |
   |                      |                      |                    |
   |--PUT (file)---------------------->|         |                    |
   |  to presigned URL                 |         |                    |
   |<-200 OK---------------------------|         |                    |
   |                      |                      |                    |
   |--PATCH /profile----->|                      |                    |
   |  {avatarKey}         |                      |                    |
   |                      |                      |                    |
   |                      |--UpdateItem(avatarKey)------------------>|
   |                      |<-Updated profile-------------------------|
   |                      |                      |                    |
   |<-Success + profile---|                      |                    |
   |                      |                      |                    |
```

### 4️⃣ Change Password Flow
```
Frontend                Lambda                  Cognito
   |                      |                        |
   |--POST /change-pwd--->|                        |
   |  {old, new}          |                        |
   |  (with access token) |                        |
   |                      |                        |
   |                      |--ChangePassword------->|
   |                      |  (verify old pwd)      |
   |                      |                        |
   |                      |<-Success/Error---------|
   |                      |                        |
   |<-Response------------|                        |
   |                      |                        |
```

---

## 🎨 Frontend Integration Example

### React Hook Example

```javascript
// useProfile.js
import { useState, useEffect } from 'react';

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL;
  const token = localStorage.getItem('idToken');

  // Fetch profile
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch profile');
      
      const data = await response.json();
      setProfile(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update profile
  const updateProfile = async (updates) => {
    try {
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update profile');
      
      const data = await response.json();
      setProfile(data.profile);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Upload avatar
  const uploadAvatar = async (file) => {
    try {
      // Step 1: Get upload URL
      const urlResponse = await fetch(`${API_URL}/profile/avatar-upload-url`, {
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
      
      if (!urlResponse.ok) throw new Error('Failed to get upload URL');
      
      const { uploadUrl, avatarKey } = await urlResponse.json();
      
      // Step 2: Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });
      
      if (!uploadResponse.ok) throw new Error('Failed to upload avatar');
      
      // Step 3: Update profile with avatar key
      await updateProfile({ avatarKey });
      
      return avatarKey;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Change password
  const changePassword = async (oldPassword, newPassword) => {
    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          oldPassword,
          newPassword
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change password');
      }
      
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token]);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    uploadAvatar,
    changePassword
  };
}
```

### Component Example

```javascript
// ProfilePage.jsx
import React, { useState } from 'react';
import { useProfile } from './hooks/useProfile';

export function ProfilePage() {
  const { profile, loading, updateProfile, uploadAvatar, changePassword } = useProfile();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    bio: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(formData);
      setEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert('Failed to update profile: ' + err.message);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    try {
      await uploadAvatar(file);
      alert('Avatar uploaded successfully!');
    } catch (err) {
      alert('Failed to upload avatar: ' + err.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="profile-page">
      <div className="avatar-section">
        <img 
          src={profile?.avatarUrl || '/default-avatar.png'} 
          alt="Avatar"
          className="avatar"
        />
        <input 
          type="file" 
          accept="image/*"
          onChange={handleAvatarChange}
        />
      </div>

      {editing ? (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
          />
          <textarea
            placeholder="Bio"
            value={formData.bio}
            onChange={(e) => setFormData({...formData, bio: e.target.value})}
          />
          <button type="submit">Save</button>
          <button type="button" onClick={() => setEditing(false)}>Cancel</button>
        </form>
      ) : (
        <div className="profile-info">
          <h2>{profile?.username || 'No username'}</h2>
          <p>{profile?.bio || 'No bio'}</p>
          <button onClick={() => setEditing(true)}>Edit Profile</button>
        </div>
      )}
    </div>
  );
}
```

---

## 🔐 Security Considerations

### 1. Token Validation
- Tất cả endpoints đều validate JWT token qua Cognito Authorizer
- Token phải còn valid (chưa expire)
- User chỉ có thể update profile của chính mình

### 2. Avatar Upload
- Presigned URL có timeout 15 phút
- Chỉ cho phép upload vào folder `avatars/{userId}/`
- Validate content type trước khi tạo URL
- Frontend nên validate file size trước khi upload

### 3. Password Change
- Yêu cầu mật khẩu cũ để xác thực
- Cognito tự động enforce password policy
- Rate limiting để tránh brute force

### 4. Username Update
- Validate độ dài (3-30 chars)
- Đồng bộ với Cognito preferred_username
- Không enforce unique (có thể thêm sau)

---

## 📱 Mobile App Integration

### Swift (iOS) Example

```swift
class ProfileService {
    let apiURL = "https://your-api-url.com"
    var idToken: String?
    
    func getProfile(completion: @escaping (Result<Profile, Error>) -> Void) {
        guard let token = idToken else {
            completion(.failure(NSError(domain: "No token", code: 401)))
            return
        }
        
        var request = URLRequest(url: URL(string: "\(apiURL)/profile")!)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            // Handle response
        }.resume()
    }
    
    func uploadAvatar(image: UIImage, completion: @escaping (Result<String, Error>) -> Void) {
        // 1. Get upload URL
        // 2. Upload image to S3
        // 3. Update profile with avatar key
    }
}
```

---

## 🧪 Testing Scenarios

### Happy Path
1. ✅ User registers and logs in
2. ✅ Gets empty profile
3. ✅ Updates username and bio
4. ✅ Uploads avatar
5. ✅ Gets profile with avatar URL
6. ✅ Changes password successfully

### Error Cases
1. ❌ Unauthorized access (no token)
2. ❌ Invalid token (expired)
3. ❌ Invalid username (too short/long)
4. ❌ Invalid avatar content type
5. ❌ Wrong old password
6. ❌ Weak new password

---

## 📊 Performance Considerations

### Caching Strategy
- Avatar URLs có presigned URL cache 1 hour
- Frontend nên cache profile data
- CloudFront cache avatars với long TTL

### Optimization Tips
1. Resize avatar ở frontend trước khi upload
2. Use WebP format cho avatars
3. Lazy load avatars trong lists
4. Batch profile updates nếu có nhiều changes

---

**Last Updated:** 2024-12-02
