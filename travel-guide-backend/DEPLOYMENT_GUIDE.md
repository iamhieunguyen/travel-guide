# 🚀 Deployment Guide - User Profile Feature

## ⚠️ Python Version Issue

SAM template yêu cầu **Python 3.11** nhưng bạn có **Python 3.14**.

### Solutions:

#### Option 1: Deploy trực tiếp lên AWS (Khuyến nghị)
AWS Lambda sẽ dùng Python 3.11 runtime, không cần Python 3.11 local.

#### Option 2: Cài Python 3.11 cho local testing
Download từ: https://www.python.org/downloads/release/python-3110/

---

## 📋 Prerequisites

1. **AWS CLI** đã cài và configured
2. **AWS Account** với credentials
3. **Docker** đang chạy (cho SAM build)
4. **SAM CLI** đã cài (✅ bạn đã có)

---

## 🔧 Setup AWS Credentials

### Kiểm tra AWS credentials:
```powershell
aws configure list
```

### Nếu chưa có, configure:
```powershell
aws configure
```

Nhập:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (vd: ap-southeast-1)
- Default output format (json)

---

## 🚀 Deploy to AWS

### Step 1: Build project
```powershell
cd travel-guide-backend
python -m samcli build --use-container
```

**Note:** `--use-container` sẽ dùng Docker để build với Python 3.11, không cần Python 3.11 local!

### Step 2: Deploy (lần đầu)
```powershell
python -m samcli deploy --guided
```

Trả lời các câu hỏi:
- Stack Name: `travel-guide-backend` (hoặc tên bạn muốn)
- AWS Region: `ap-southeast-1` (hoặc region bạn muốn)
- Confirm changes: `Y`
- Allow SAM CLI IAM role creation: `Y`
- Disable rollback: `N`
- Save arguments to config: `Y`

### Step 3: Deploy lần sau (đã có config)
```powershell
python -m samcli build --use-container
python -m samcli deploy
```

---

## 📊 Get API URL

Sau khi deploy thành công, lấy API URL:

```powershell
aws cloudformation describe-stacks `
  --stack-name travel-guide-backend `
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' `
  --output text
```

Hoặc xem tất cả outputs:
```powershell
aws cloudformation describe-stacks `
  --stack-name travel-guide-backend `
  --query 'Stacks[0].Outputs' `
  --output table
```

---

## 🧪 Test API

### 1. Register user
```powershell
$API_URL = "https://your-api-id.execute-api.region.amazonaws.com/Prod"

Invoke-RestMethod -Uri "$API_URL/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{
    username = "testuser"
    email = "test@example.com"
    password = "TestPass123"
  } | ConvertTo-Json)
```

### 2. Confirm user (check email for code)
```powershell
Invoke-RestMethod -Uri "$API_URL/auth/confirm" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{
    username = "testuser"
    confirmation_code = "123456"
  } | ConvertTo-Json)
```

### 3. Login
```powershell
$loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{
    username = "testuser"
    password = "TestPass123"
  } | ConvertTo-Json)

$TOKEN = $loginResponse.id_token
Write-Host "Token: $TOKEN"
```

### 4. Get Profile
```powershell
Invoke-RestMethod -Uri "$API_URL/profile" `
  -Method GET `
  -Headers @{
    "Authorization" = "Bearer $TOKEN"
  }
```

### 5. Update Profile
```powershell
Invoke-RestMethod -Uri "$API_URL/profile" `
  -Method PATCH `
  -ContentType "application/json" `
  -Headers @{
    "Authorization" = "Bearer $TOKEN"
  } `
  -Body (@{
    username = "new_username"
    bio = "I love traveling!"
  } | ConvertTo-Json)
```

---

## 🔍 Monitoring & Debugging

### View CloudWatch Logs
```powershell
# List log groups
aws logs describe-log-groups --query 'logGroups[?contains(logGroupName, `travel-guide`)].logGroupName'

# Tail logs for a specific function
python -m samcli logs -n GetProfileFunction --stack-name travel-guide-backend --tail
```

### Check Stack Status
```powershell
aws cloudformation describe-stacks `
  --stack-name travel-guide-backend `
  --query 'Stacks[0].StackStatus'
```

### List All Resources
```powershell
aws cloudformation list-stack-resources `
  --stack-name travel-guide-backend `
  --output table
```

---

## 🗑️ Cleanup (Xóa stack)

Khi muốn xóa toàn bộ resources:

```powershell
python -m samcli delete --stack-name travel-guide-backend
```

**Warning:** Điều này sẽ xóa:
- Tất cả Lambda functions
- DynamoDB tables (và data)
- S3 buckets (phải xóa objects trước)
- API Gateway
- CloudFront distribution
- Cognito User Pool

---

## 🐛 Common Issues

### Issue 1: "Unable to upload artifact"
**Solution:** Check AWS credentials và permissions

### Issue 2: "Stack already exists"
**Solution:** Dùng `python -m samcli deploy` (không cần --guided)

### Issue 3: "Docker not running"
**Solution:** Start Docker Desktop

### Issue 4: "Python version mismatch"
**Solution:** Dùng `--use-container` flag khi build

### Issue 5: S3 bucket name conflict
**Solution:** SAM sẽ tự tạo unique bucket name

---

## 📝 Update Existing Stack

Khi có thay đổi code:

```powershell
# 1. Build
python -m samcli build --use-container

# 2. Deploy
python -m samcli deploy

# 3. Test
# Dùng API URL từ outputs
```

---

## 🔐 Security Best Practices

1. **Không commit AWS credentials** vào git
2. **Dùng IAM roles** thay vì access keys khi có thể
3. **Enable CloudTrail** để audit
4. **Set up billing alerts** để tránh chi phí bất ngờ
5. **Dùng Secrets Manager** cho sensitive data

---

## 💰 Cost Estimation

### Free Tier (12 tháng đầu):
- Lambda: 1M requests/month free
- DynamoDB: 25GB storage free
- S3: 5GB storage free
- API Gateway: 1M requests/month free

### Sau Free Tier:
- Lambda: ~$0.20 per 1M requests
- DynamoDB: ~$0.25 per GB/month
- S3: ~$0.023 per GB/month
- CloudFront: ~$0.085 per GB transfer

**Estimated cost cho dev/test:** < $5/month

---

## 📞 Support

Nếu gặp vấn đề:
1. Check CloudWatch Logs
2. Check Stack Events trong CloudFormation console
3. Verify IAM permissions
4. Check AWS Service Health Dashboard

---

**Happy Deploying! 🚀**
