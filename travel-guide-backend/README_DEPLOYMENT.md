# Travel Guide Backend - Deployment Guide

## 🎉 Current Status: ALL SERVICES DEPLOYED SUCCESSFULLY

### Quick Status Check
```bash
aws cloudformation list-stacks \
  --region us-east-1 \
  --profile default \
  --query "StackSummaries[?contains(StackName, 'travel-guide') && StackStatus != 'DELETE_COMPLETE'].{Name:StackName, Status:StackStatus}" \
  --output table
```

## 📋 Deployed Stacks

| Stack Name | Status | Description |
|------------|--------|-------------|
| travel-guide-core-staging | ✅ UPDATE_COMPLETE | S3, DynamoDB, Cognito, SQS, CloudFront |
| travel-guide-auth-staging | ✅ CREATE_COMPLETE | User authentication APIs |
| travel-guide-article-service-staging | ✅ CREATE_COMPLETE | Article CRUD operations |
| travel-guide-media-staging | ✅ CREATE_COMPLETE | Image processing & thumbnails |
| travel-guide-ai-staging | ✅ CREATE_COMPLETE | AI image analysis with Rekognition |

## 🚀 Deployment Commands

### Full Deployment (All Services)
```bash
./scripts/deploy.sh staging
```

### Individual Service Deployment
```bash
# 1. Core Infrastructure (Deploy this first!)
./scripts/deploy-core.sh staging us-east-1 default

# 2. Auth Service
./scripts/deploy-auth.sh staging us-east-1 default

# 3. Article Service
./scripts/deploy-article.sh staging us-east-1 default

# 4. Media Service
./scripts/deploy-media.sh staging us-east-1 default

# 5. AI Service
./scripts/deploy-ai.sh staging us-east-1 default
```

### Update Core Stack (PowerShell)
```powershell
.\scripts\update-core-stack.ps1 -Environment staging -Region us-east-1 -Profile default
```

## 📁 Project Structure

```
travel-guide-backend/
├── core-infra/
│   ├── template.yaml              # Core infrastructure CloudFormation
│   └── parameters/
│       ├── staging.json
│       └── prod.json
├── services/
│   ├── auth-service/
│   │   ├── template.yaml
│   │   └── functions/
│   ├── article-service/
│   │   ├── template.yaml
│   │   └── functions/
│   ├── media-service/
│   │   ├── template.yaml
│   │   └── functions/
│   └── ai-service/
│       ├── template.yaml
│       └── functions/
├── shared/
│   ├── layers/common/             # Shared Lambda layers
│   └── libs/                      # Shared Python libraries
├── scripts/
│   ├── deploy.sh                  # Deploy all services
│   ├── deploy-core.sh             # Deploy core infrastructure
│   ├── deploy-auth.sh             # Deploy auth service
│   ├── deploy-article.sh          # Deploy article service
│   ├── deploy-media.sh            # Deploy media service
│   ├── deploy-ai.sh               # Deploy AI service
│   └── update-core-stack.ps1      # PowerShell script for Windows
└── docs/
    ├── ARCHITECTURE_QUEUES.md     # Queue architecture details
    ├── DEPLOYMENT_SUCCESS.md      # Deployment results
    ├── UPDATE_CORE_STACK.md       # Core stack update guide
    └── CHANGES_SUMMARY.md         # Summary of all changes
```

## 🔑 Important Resources

### S3 Buckets
- **Images**: `travel-guide-images-staging-336468391794`
- **Static Site**: `travel-guide-static-staging-336468391794`
- **Deployment**: `travel-guide-deployment-staging-336468391794`

### DynamoDB Tables
- **Articles**: `articles-staging`
- **User Favorites**: `user-favorites-staging`

### Cognito
- **User Pool ID**: `us-east-1_x6DykTrIS`
- **Client ID**: `6mpsh1p97r9jd44ho886v1p9jr`

### SQS Queues (Shared)
- `travel-guide-staging-detect-labels-queue`
- `travel-guide-staging-content-moderation-queue`
- `travel-guide-staging-image-processing-queue`
- `travel-guide-staging-image-processing-dlq` (Dead Letter Queue)

### CloudFront
- **Domain**: `d2gqmy4jkplt65.cloudfront.net`

## 🔧 Configuration

### Environment Variables
All Lambda functions automatically receive environment variables from CloudFormation:
- `TABLE_NAME` - DynamoDB table name
- `BUCKET_NAME` - S3 bucket name
- `USER_POOL_ID` - Cognito User Pool ID
- `QUEUE_URL` - SQS queue URL
- `ENVIRONMENT` - Current environment (staging/prod)

### CORS Configuration
Current setting: `*` (all origins)

**For Production**: Update to specific domain
```yaml
Parameters:
  CorsOrigin:
    Type: String
    Default: "https://yourdomain.com"
```

## 📊 Monitoring

### CloudWatch Logs
```bash
# View logs for specific Lambda function
aws logs tail /aws/lambda/travel-guide-ai-staging-DetectLabelsFunction --follow

# View logs for all functions in a service
aws logs tail /aws/lambda/travel-guide-ai-staging --follow
```

### Stack Events
```bash
# View recent stack events
aws cloudformation describe-stack-events \
  --stack-name travel-guide-ai-staging \
  --max-items 20 \
  --query 'StackEvents[*].[Timestamp,ResourceStatus,ResourceType,LogicalResourceId]' \
  --output table
```

### SQS Queue Metrics
```bash
# Check queue depth
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/336468391794/travel-guide-staging-detect-labels-queue \
  --attribute-names ApproximateNumberOfMessages
```

## 🧪 Testing

### Test Auth API
```bash
# Get Auth API URL
AUTH_API=$(aws cloudformation describe-stacks \
  --stack-name travel-guide-auth-staging \
  --query "Stacks[0].Outputs[?OutputKey=='AuthApiUrl'].OutputValue" \
  --output text)

# Test registration
curl -X POST $AUTH_API/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'
```

### Test Article API
```bash
# Get Article API URL
ARTICLE_API=$(aws cloudformation describe-stacks \
  --stack-name travel-guide-article-service-staging \
  --query "Stacks[0].Outputs[?OutputKey=='ArticleApiUrl'].OutputValue" \
  --output text)

# Test list articles
curl $ARTICLE_API/articles
```

### Test Image Upload
```bash
# Upload test image to S3
aws s3 cp test-image.jpg \
  s3://travel-guide-images-staging-336468391794/articles/test-image.jpg

# Check if SQS received the message
aws sqs receive-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/336468391794/travel-guide-staging-detect-labels-queue
```

## 🐛 Troubleshooting

### Stack in ROLLBACK_COMPLETE State
The deploy scripts now automatically handle this:
```bash
# Manual fix if needed
aws cloudformation delete-stack --stack-name travel-guide-ai-staging
aws cloudformation wait stack-delete-complete --stack-name travel-guide-ai-staging
./scripts/deploy-ai.sh staging
```

### Missing Queue Exports
```bash
# Update core stack to add missing exports
./scripts/update-core-stack.ps1
# or
aws cloudformation update-stack \
  --stack-name travel-guide-core-staging \
  --template-body file://core-infra/template.yaml \
  --parameters ParameterKey=Environment,ParameterValue=staging ParameterKey=CorsOrigin,ParameterValue=* \
  --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND
```

### Lambda Function Errors
```bash
# Check function logs
aws logs tail /aws/lambda/FUNCTION_NAME --follow

# Check function configuration
aws lambda get-function --function-name FUNCTION_NAME

# Test function locally
sam local invoke FunctionName -e events/test-event.json
```

## 🔒 Security Best Practices

### Current Security Measures
- ✅ S3 buckets have public access blocked
- ✅ CloudFront uses OAI for secure S3 access
- ✅ Cognito handles user authentication
- ✅ IAM roles follow least privilege principle
- ✅ All data encrypted at rest (S3, DynamoDB)

### Recommended for Production
- ⚠️ Update CORS from `*` to specific domains
- ⚠️ Enable CloudTrail for audit logging
- ⚠️ Set up AWS WAF for API Gateway
- ⚠️ Enable MFA for Cognito users
- ⚠️ Use custom domain with SSL certificate
- ⚠️ Set up CloudWatch alarms for errors
- ⚠️ Enable S3 versioning and lifecycle policies

## 💰 Cost Optimization

### Current Configuration
- Lambda: On-demand (pay per execution)
- DynamoDB: PAY_PER_REQUEST mode
- S3: Standard storage class
- CloudFront: PriceClass_100 (US, Canada, Europe)
- SQS: Free tier (1M requests/month)

### Estimated Monthly Cost (Low Traffic)
- Lambda: $0-5
- DynamoDB: $0-10
- S3: $1-5
- CloudFront: $1-10
- SQS: $0 (within free tier)
- **Total**: ~$2-30/month

## 📚 Documentation

- [ARCHITECTURE_QUEUES.md](ARCHITECTURE_QUEUES.md) - Queue architecture details
- [DEPLOYMENT_SUCCESS.md](DEPLOYMENT_SUCCESS.md) - Latest deployment results
- [UPDATE_CORE_STACK.md](UPDATE_CORE_STACK.md) - How to update core stack
- [CHANGES_SUMMARY.md](CHANGES_SUMMARY.md) - Summary of recent changes

## 🤝 Contributing

### Making Changes
1. Create a feature branch
2. Make your changes
3. Test locally with `sam local`
4. Deploy to staging
5. Test in staging environment
6. Create pull request

### Deployment Workflow
```bash
# 1. Make changes
git checkout -b feature/my-feature

# 2. Test locally
cd services/ai-service
sam build
sam local invoke DetectLabelsFunction -e events/test.json

# 3. Deploy to staging
./scripts/deploy-ai.sh staging

# 4. Commit and push
git add .
git commit -m "Add new feature"
git push origin feature/my-feature
```

## 📞 Support

### Common Issues
1. **Queue AlreadyExists**: Fixed! Queues now centralized in core-infra
2. **Stack ROLLBACK_COMPLETE**: Fixed! Auto-deletion in deploy scripts
3. **Missing exports**: Run `./scripts/update-core-stack.ps1`

### Getting Help
- Check CloudWatch Logs for error details
- Review stack events in CloudFormation console
- Check this documentation for troubleshooting steps

---

**Last Updated**: December 2, 2025  
**Version**: 1.0.0  
**Environment**: staging  
**Region**: us-east-1  
**Status**: ✅ All services deployed successfully
