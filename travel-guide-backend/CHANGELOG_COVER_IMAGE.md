# Changelog - Tính năng Ảnh Bìa (Cover Image)

## Ngày: 2025-12-08

### ✨ Tính năng mới

#### 1. API Endpoint mới
- **POST /profile/cover-upload-url** - Tạo presigned URL để upload ảnh bìa
  - Input: `filename`, `contentType`
  - Output: `uploadUrl`, `coverImageKey`, `expiresIn`, `maxSizeBytes`
  - Giới hạn: 10MB, định dạng JPEG/PNG/WebP
  - Thời gian hết hạn: 15 phút

#### 2. Cập nhật API hiện có

**GET /profile**
- Thêm trường mới trong response:
  - `coverImageKey`: Key của ảnh bìa trong S3
  - `coverImageUrl`: Presigned URL để xem ảnh bìa (hết hạn sau 1 giờ)

**PATCH /profile**
- Cho phép cập nhật trường `coverImageKey`
- Validation tự động

### 🗂️ Thay đổi cơ sở hạ tầng

#### S3 Bucket
- Thêm folder `covers/` để lưu ảnh bìa
- Cấu trúc: `covers/{userId}/{uuid}.{ext}`

#### CloudFront
- Thêm cache behavior cho path pattern `covers/*`
- Cấu hình tương tự `avatars/*` và `thumbnails/*`
- Tối ưu hiệu suất với compression và caching

#### Lambda Functions
- **GetCoverUploadUrlFunction**: Lambda function mới xử lý việc tạo presigned URL
  - Runtime: Python 3.11
  - Timeout: 10s
  - Memory: 512MB
  - Policies: S3WritePolicy

### 📝 Files đã thay đổi

1. **travel-guide-backend/template.yaml**
   - Thêm `GetCoverUploadUrlFunction` resource
   - Thêm CloudFront cache behavior cho `covers/*`
   - Thêm folder `covers/` vào FolderCreationCustomResource

2. **travel-guide-backend/functions/auth/get_cover_upload_url.py** (MỚI)
   - Lambda handler cho endpoint upload cover image
   - Validation content type và filename
   - Tạo presigned URL với expiration 15 phút

3. **travel-guide-backend/functions/auth/get_profile.py**
   - Thêm logic tạo presigned URL cho cover image
   - Thêm `coverImageKey` và `coverImageUrl` vào response
   - Xử lý trường hợp chưa có cover image

4. **travel-guide-backend/functions/auth/update_profile.py**
   - Thêm `coverImageKey` vào danh sách `allowed_fields`
   - Cho phép user cập nhật cover image key

### 📚 Tài liệu

1. **COVER_IMAGE_FEATURE.md** (MỚI)
   - Hướng dẫn sử dụng đầy đủ
   - API documentation
   - Ví dụ tích hợp frontend
   - Best practices

2. **scripts/test_cover_image.py** (MỚI)
   - Script Python để test tính năng
   - Test flow hoàn chỉnh từ upload đến verify

3. **scripts/test_cover_image.sh** (MỚI)
   - Script Bash để test tính năng
   - Sử dụng curl commands

### 🔒 Bảo mật

- ✅ Chỉ user đã authenticate mới có thể upload
- ✅ Mỗi user chỉ upload vào folder riêng của mình
- ✅ Presigned URL có thời gian hết hạn
- ✅ Validation content type
- ✅ Giới hạn kích thước file (10MB)
- ✅ CloudFront OAI bảo vệ S3 bucket

### 🚀 Cách deploy

```bash
cd travel-guide-backend
sam build
sam deploy
```

### ✅ Testing

```bash
# Sử dụng Python script
python scripts/test_cover_image.py <API_URL> <AUTH_TOKEN> <IMAGE_FILE>

# Hoặc sử dụng Bash script
bash scripts/test_cover_image.sh <API_URL> <AUTH_TOKEN> <IMAGE_FILE>
```

### 📊 Thống kê thay đổi

- **Files mới**: 4
- **Files sửa**: 3
- **Lambda functions mới**: 1
- **API endpoints mới**: 1
- **API endpoints cập nhật**: 2
- **Lines of code**: ~300

### 🎯 Tương thích ngược

- ✅ Hoàn toàn tương thích với code cũ
- ✅ Không breaking changes
- ✅ Profile cũ vẫn hoạt động bình thường (coverImageKey = null)

### 🔮 Cải tiến trong tương lai

- [ ] Tự động resize ảnh bìa về kích thước chuẩn
- [ ] Tạo thumbnail cho ảnh bìa
- [ ] Content moderation với Rekognition
- [ ] Tự động xóa ảnh cũ khi upload ảnh mới
- [ ] Hỗ trợ crop ảnh trước khi upload
- [ ] Validation kích thước và tỷ lệ ảnh

### 📞 Liên hệ

Nếu có vấn đề hoặc câu hỏi, vui lòng tạo issue hoặc liên hệ team.
