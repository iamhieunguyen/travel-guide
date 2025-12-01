# Kiến trúc SQS Queues - Travel Guide Backend

## Tổng quan
Để tránh lỗi "AlreadyExists" khi deploy, tất cả SQS queues được tập trung tạo ở **core-infra** và các service khác sẽ import thông qua CloudFormation Exports.

## Core Infrastructure (core-infra/template.yaml)

### Queues được tạo:
1. **ImageProcessingDLQ** - Dead Letter Queue chung
   - Queue Name: `travel-guide-{env}-image-processing-dlq`
   - Exports: `ImageProcessingDLQUrl`, `ImageProcessingDLQArn`

2. **DetectLabelsQueue** - Cho AI service phát hiện labels
   - Queue Name: `travel-guide-{env}-detect-labels-queue`
   - Exports: `DetectLabelsQueueUrl`, `DetectLabelsQueueArn`
   - DLQ: ImageProcessingDLQ

3. **ContentModerationQueue** - Cho AI service kiểm duyệt nội dung
   - Queue Name: `travel-guide-{env}-content-moderation-queue`
   - Exports: `ContentModerationQueueUrl`, `ContentModerationQueueArn`
   - DLQ: ImageProcessingDLQ

4. **ImageProcessingQueue** - Queue xử lý ảnh chung
   - Queue Name: `travel-guide-{env}-image-processing-queue`
   - Exports: `ImageProcessingQueueUrl`, `ImageProcessingQueueArn`
   - DLQ: ImageProcessingDLQ

### Queue Policies:
- Cho phép S3 (ArticleImagesBucket) gửi message đến các queue

## AI Service (services/ai-service/template.yaml)

### Queues sử dụng (Import từ core):
- **DetectLabelsQueue** - Lambda DetectLabelsFunction lắng nghe queue này
- **ContentModerationQueue** - Lambda ContentModerationFunction lắng nghe queue này

### Không tạo queue nào
- Tất cả queue đều import từ core stack

## Media Service (services/media-service/template.yaml)

### Queues tạo riêng (chỉ dùng cho media service):
1. **ImageValidatorQueue** - Validate ảnh
   - Queue Name: `{stack-name}-image-validator-queue`
   - DLQ: Import từ core (ImageProcessingDLQ)

2. **ImageAnalyzerQueue** - Phân tích ảnh
   - Queue Name: `{stack-name}-image-analyzer-queue`
   - DLQ: Import từ core (ImageProcessingDLQ)

3. **ThumbnailQueue** - Tạo thumbnail
   - Queue Name: `{stack-name}-thumbnail-queue`
   - DLQ: Import từ core (ImageProcessingDLQ)

### Queues sử dụng (Import từ core):
- **ImageProcessingDLQ** - Dead Letter Queue
- **DetectLabelsQueue** - Gửi message đến AI service

## Luồng Deploy

```bash
# 1. Deploy core infrastructure trước (tạo tất cả shared queues)
./scripts/deploy-core.sh staging

# 2. Deploy các services (import queues từ core)
./scripts/deploy-ai.sh staging
./scripts/deploy-media.sh staging

# Hoặc deploy tất cả cùng lúc
./scripts/deploy.sh staging
```

## Lợi ích của kiến trúc này

1. **Tránh duplicate**: Không có queue nào bị tạo 2 lần
2. **Centralized management**: Quản lý queue tập trung ở core-infra
3. **Reusability**: Các service có thể dùng chung queue
4. **Easy cleanup**: Xóa core stack sẽ xóa tất cả shared queues
5. **Clear dependencies**: Rõ ràng service nào phụ thuộc vào queue nào

## Xử lý lỗi ROLLBACK_COMPLETE

Script `deploy-ai.sh` đã được cập nhật để tự động:
1. Kiểm tra trạng thái stack
2. Nếu stack ở trạng thái ROLLBACK_COMPLETE, tự động xóa
3. Đợi stack được xóa hoàn toàn
4. Deploy lại stack mới

## Lưu ý quan trọng

- **Luôn deploy core-infra trước** khi deploy các service
- Nếu cần thay đổi queue configuration, sửa ở core-infra
- Các service chỉ nên tạo queue riêng nếu queue đó chỉ dùng cho service đó
- Queue policies cho shared queues được định nghĩa ở core-infra
