# Hướng dẫn Update Core Stack

## Vấn đề
Core stack hiện tại thiếu các exports:
- `ImageProcessingDLQArn`
- `ContentModerationQueueUrl`
- `ContentModerationQueueArn`
- `ImageProcessingQueueUrl`
- `ImageProcessingQueueArn`

## Giải pháp

### Cách 1: Dùng Git Bash hoặc WSL (Khuyến nghị)
```bash
# Mở Git Bash hoặc WSL terminal, sau đó chạy:
cd /d/AWS/AWS_Project/travel-guide-backend
./scripts/deploy-core.sh staging us-east-1 default
```

### Cách 2: Dùng AWS CLI trực tiếp (Windows CMD/PowerShell)
```powershell
# Update core stack
aws cloudformation update-stack `
  --stack-name travel-guide-core-staging `
  --template-body file://core-infra/template.yaml `
  --parameters ParameterKey=Environment,ParameterValue=staging ParameterKey=CorsOrigin,ParameterValue=* `
  --capabilities CAPABILITY_NAMED_IAM `
  --region us-east-1 `
  --profile default

# Đợi stack update xong
aws cloudformation wait stack-update-complete `
  --stack-name travel-guide-core-staging `
  --region us-east-1 `
  --profile default

# Kiểm tra outputs mới
aws cloudformation describe-stacks `
  --stack-name travel-guide-core-staging `
  --region us-east-1 `
  --profile default `
  --query "Stacks[0].Outputs" `
  --output table
```

### Cách 3: Dùng AWS Console
1. Mở AWS CloudFormation Console
2. Chọn stack `travel-guide-core-staging`
3. Click "Update"
4. Chọn "Replace current template"
5. Upload file `core-infra/template.yaml`
6. Giữ nguyên parameters
7. Click "Next" -> "Next" -> "Update stack"
8. Đợi stack update xong (khoảng 2-5 phút)

## Sau khi update core stack xong

Kiểm tra exports:
```powershell
aws cloudformation describe-stacks `
  --stack-name travel-guide-core-staging `
  --region us-east-1 `
  --profile default `
  --query "Stacks[0].Outputs[?contains(OutputKey, 'DLQ') || contains(OutputKey, 'Queue')]" `
  --output table
```

Bạn sẽ thấy các exports mới:
- ImageProcessingDLQArn ✓
- DetectLabelsQueueArn ✓
- DetectLabelsQueueUrl ✓
- ContentModerationQueueArn ✓
- ContentModerationQueueUrl ✓
- ImageProcessingQueueArn ✓
- ImageProcessingQueueUrl ✓

## Sau đó deploy media service

### Xóa media stack cũ (nếu đang ở trạng thái ROLLBACK)
```powershell
aws cloudformation delete-stack `
  --stack-name travel-guide-media-staging `
  --region us-east-1 `
  --profile default

aws cloudformation wait stack-delete-complete `
  --stack-name travel-guide-media-staging `
  --region us-east-1 `
  --profile default
```

### Deploy media service
```bash
# Dùng Git Bash/WSL
./scripts/deploy-media.sh staging us-east-1 default
```

Hoặc dùng PowerShell:
```powershell
# Trong thư mục services/media-service
sam build
sam deploy `
  --stack-name travel-guide-media-staging `
  --template-file template.yaml `
  --region us-east-1 `
  --profile default `
  --s3-bucket travel-guide-deployment-staging-336468391794 `
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND `
  --no-confirm-changeset `
  --parameter-overrides CoreStackName=travel-guide-core-staging Environment=staging CorsOrigin=*
```
