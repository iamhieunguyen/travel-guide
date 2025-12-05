#!/bin/bash
set -e  # Exit on any error

# Trap errors to prevent window from closing immediately
cleanup() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo ""
    echo "========================================"
    echo " 🚨  DEPLOYMENT FAILED"
    echo "========================================"
    echo "Error code: $exit_code"
    echo "Command that failed: ${BASH_COMMAND}"
    echo ""
    read -p "Press Enter to exit..."
  fi
}
trap cleanup ERR EXIT

# Redirect all output to log file while still showing on screen
LOG_FILE="deploy-log-$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -i "$LOG_FILE") 2>&1

# Configuration
ENV=${1:-staging}
REGION=${AWS_REGION:-us-east-1}
PROFILE=${AWS_PROFILE:-default}

echo " 🚀🚀🚀   DEPLOYING TRAVEL GUIDE FULL STACK TO $ENV ENVIRONMENT   🚀🚀🚀 "
echo "   Region: $REGION"
echo "   Profile: $PROFILE"
echo "   Log file: $LOG_FILE"
echo ""
echo "This will deploy in the following order:"
echo "1. Core Infrastructure (S3, DynamoDB, Cognito, CloudFront)"
echo "2. Auth Service (User registration, login, confirmation)"
echo "3. Article Service (CRUD operations, search, upload URLs)"
echo "4. Media Service (Thumbnail generation)"
echo "5. AI Service (Image analysis, content moderation)"
echo "6. Gallery Service (Trending tags, photo gallery)"
echo "7. Notification Service (Email notifications)"
echo ""
read -p "Do you want to continue? (y/n): " confirm
if [[ ! "$confirm" =~ [yY](es)*$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo " 🔧   Setting up deployment bucket if needed..."
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text --profile $PROFILE)
DEPLOY_BUCKET="travel-guide-deployment-$ENV-$ACCOUNT_ID"
if aws s3 ls "s3://$DEPLOY_BUCKET" --region $REGION --profile $PROFILE &>/dev/null; then
    echo " ✅   Deployment bucket already exists: $DEPLOY_BUCKET"
else
    echo " 📦   Creating deployment bucket: $DEPLOY_BUCKET"
    if [[ "$REGION" == "us-east-1" ]]; then
        aws s3api create-bucket \
            --bucket $DEPLOY_BUCKET \
            --region $REGION \
            --profile $PROFILE
    else
        aws s3api create-bucket \
            --bucket $DEPLOY_BUCKET \
            --region $REGION \
            --profile $PROFILE \
            --create-bucket-configuration LocationConstraint=$REGION
    fi
fi

echo ""
echo " 🔧   Setting up .aws-sam directory..."
mkdir -p .aws-sam/build

# Step 1: Deploy Core Infrastructure
echo ""
echo "========================================"
echo "  🚀   DEPLOYING CORE INFRASTRUCTURE"
echo "========================================"
./scripts/deploy-core.sh $ENV $REGION $PROFILE

# Verify core stack was deployed successfully
CORE_STACK_NAME="travel-guide-core-$ENV"
echo " ⏳   Waiting for core stack to be ready..."
for i in {1..30}; do
    CORE_STATUS=$(aws cloudformation describe-stacks --stack-name $CORE_STACK_NAME --query 'Stacks[0].StackStatus' --output text --region $REGION --profile $PROFILE 2>/dev/null || echo "FAILED")
    if [[ "$CORE_STATUS" == "CREATE_COMPLETE" ]] || [[ "$CORE_STATUS" == "UPDATE_COMPLETE" ]]; then
        echo " ✅  Core stack is ready."
        break
    elif [[ "$CORE_STATUS" == *"FAILED"* ]] || [[ "$CORE_STATUS" == *"ROLLBACK"* ]]; then
        echo " ❌  Core stack deployment failed with status: $CORE_STATUS"
        echo " 🔍  Getting detailed stack events..."
        aws cloudformation describe-stack-events --stack-name $CORE_STACK_NAME --region $REGION --profile $PROFILE --query 'StackEvents[?ResourceStatus!=`CREATE_IN_PROGRESS` && ResourceStatus!=`UPDATE_IN_PROGRESS`][0:10]' --output table
        exit 1
    fi
    echo " ⏳  Waiting for core stack to be ready... ($i/30)"
    sleep 10
done

if [[ "$CORE_STATUS" != "CREATE_COMPLETE" ]] && [[ "$CORE_STATUS" != "UPDATE_COMPLETE" ]]; then
    echo " ❌  Core stack deployment timed out. Status: $CORE_STATUS"
    echo " 🔍  Getting detailed stack events..."
    aws cloudformation describe-stack-events --stack-name $CORE_STACK_NAME --region $REGION --profile $PROFILE --query 'StackEvents[?ResourceStatus!=`CREATE_IN_PROGRESS` && ResourceStatus!=`UPDATE_IN_PROGRESS`][0:10]' --output table
    exit 1
fi

# Get Core stack outputs using AWS CLI queries
echo ""
echo " 📥   Getting core infrastructure outputs..."
ARTICLE_IMAGES_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name $CORE_STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='ArticleImagesBucketName'].OutputValue" \
    --output text \
    --region $REGION \
    --profile $PROFILE)
ARTICLES_TABLE=$(aws cloudformation describe-stacks \
    --stack-name $CORE_STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='ArticlesTableName'].OutputValue" \
    --output text \
    --region $REGION \
    --profile $PROFILE)
USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name $CORE_STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
    --output text \
    --region $REGION \
    --profile $PROFILE)
USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
    --stack-name $CORE_STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
    --output text \
    --region $REGION \
    --profile $PROFILE)
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name $CORE_STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomain'].OutputValue" \
    --output text \
    --region $REGION \
    --profile $PROFILE)

echo " ✅  Core infrastructure outputs ready"
echo "   Bucket: $ARTICLE_IMAGES_BUCKET"
echo "   Table: $ARTICLES_TABLE"
echo "   UserPool: $USER_POOL_ID"
echo ""

# Step 2: Deploy Auth Service
echo ""
echo "========================================"
echo "  🚀   DEPLOYING AUTH SERVICE"
echo "========================================"
./scripts/deploy-auth.sh $ENV $REGION $PROFILE $DEPLOY_BUCKET 

# Step 3: Deploy Article Service
echo ""
echo "========================================"
echo "  🚀   DEPLOYING ARTICLE SERVICE"
echo "========================================"
./scripts/deploy-article.sh $ENV $REGION $PROFILE $DEPLOY_BUCKET  

# Step 4: Deploy Media Service
echo ""
echo "========================================"
echo "  🚀   DEPLOYING MEDIA SERVICE"
echo "========================================"
./scripts/deploy-media.sh $ENV $REGION $PROFILE $DEPLOY_BUCKET 

# Step 5: Deploy AI Service
echo ""
echo "========================================"
echo "  🚀   DEPLOYING AI SERVICE"
echo "========================================"
./scripts/deploy-ai.sh $ENV $REGION $PROFILE $DEPLOY_BUCKET  

# Step 6: Deploy Gallery Service
echo ""
echo "========================================"
echo "  🚀   DEPLOYING GALLERY SERVICE"
echo "========================================"
./scripts/deploy-gallery.sh $ENV $REGION $PROFILE $DEPLOY_BUCKET  

# Step 7: Deploy Notification Service
echo ""
echo "========================================"
echo "  🚀   DEPLOYING NOTIFICATION SERVICE"
echo "========================================"
./scripts/deploy-notification.sh $ENV $REGION $PROFILE $DEPLOY_BUCKET  

echo ""
echo "========================================"
echo "  ✅    DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "========================================"
echo ""

# Get and print outputs
echo " 🔗   API Endpoints:"
AUTH_STACK_NAME="travel-guide-auth-service-$ENV"
ARTICLE_STACK_NAME="travel-guide-article-service-$ENV"
MEDIA_STACK_NAME="travel-guide-media-service-$ENV"
AI_STACK_NAME="travel-guide-ai-service-$ENV"
GALLERY_STACK_NAME="travel-guide-gallery-$ENV"
NOTIFICATION_STACK_NAME="travel-guide-notification-$ENV"

AUTH_API_URL=$(aws cloudformation describe-stacks \
    --stack-name $AUTH_STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='AuthApiUrl'].OutputValue" \
    --output text \
    --region $REGION \
    --profile $PROFILE 2>/dev/null || echo "Not Found")
ARTICLE_API_URL=$(aws cloudformation describe-stacks \
    --stack-name $ARTICLE_STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='ArticleApiUrl'].OutputValue" \
    --output text \
    --region $REGION \
    --profile $PROFILE 2>/dev/null || echo "Not Found")
GALLERY_API_URL=$(aws cloudformation describe-stacks \
    --stack-name $GALLERY_STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='GalleryApiUrl'].OutputValue" \
    --output text \
    --region $REGION \
    --profile $PROFILE 2>/dev/null || echo "Not Found")

echo "Auth API: $AUTH_API_URL"
echo "Article API: $ARTICLE_API_URL"
echo "Gallery API: $GALLERY_API_URL"
echo ""
echo " 🌐   CloudFront Domain:"
echo "$CLOUDFRONT_DOMAIN"
echo ""
echo " 💾   S3 Buckets:"
STATIC_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name $CORE_STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='StaticSiteBucketName'].OutputValue" \
    --output text \
    --region $REGION \
    --profile $PROFILE)
echo "Static Site: $STATIC_BUCKET"
echo "Article Images: $ARTICLE_IMAGES_BUCKET"
echo ""
echo " 🔑   Cognito Configuration:"
echo "User Pool ID: $USER_POOL_ID"
echo "Client ID: $USER_POOL_CLIENT_ID"
echo ""
echo " 🤖   AI Service Configuration:"
echo "Label detection queue: travel-guide-$ENV-detect-labels-queue"
echo "Content moderation queue: travel-guide-$ENV-content-moderation-queue"
echo ""
echo " 🔍   Next Steps:"
echo "1. Update frontend config with these endpoints"
echo "2. Upload static site content to $STATIC_BUCKET"
echo "3. Upload label priority config to $ARTICLE_IMAGES_BUCKET/config/label_priority_config.json"
echo "4. Test API endpoints with your preferred API client"
echo ""
echo " 📄  Full deployment log saved to: $LOG_FILE"
echo ""
read -p "Deployment completed successfully. Press Enter to close this window..."