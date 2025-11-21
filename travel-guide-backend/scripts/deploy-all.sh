#!/bin/bash
set -e  # Exit on any error

# Configuration
ENV=${1:-staging}
REGION=${AWS_REGION:-us-east-1}
PROFILE=${AWS_PROFILE:-default}

echo "🚀🚀🚀  DEPLOYING TRAVEL GUIDE FULL STACK TO $ENV ENVIRONMENT  🚀🚀🚀"
echo "   Region: $REGION"
echo "   Profile: $PROFILE"
echo ""

echo "This will deploy in the following order:"
echo "1. Core Infrastructure (S3, DynamoDB, Cognito, CloudFront)"
echo "2. Auth Service (User registration, login, confirmation)"
echo "3. Article Service (CRUD operations, search, upload URLs)"
echo "4. Media Service (Thumbnail generation)"
echo ""

read -p "Do you want to continue? (y/n): " confirm
if [[ ! "$confirm" =~ [yY](es)*$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "🔧  Setting up deployment bucket if needed..."
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text --profile $PROFILE)
DEPLOY_BUCKET="travel-guide-deployment-$ENV-$ACCOUNT_ID"

if aws s3 ls "s3://$DEPLOY_BUCKET" --region $REGION --profile $PROFILE &>/dev/null; then
    echo "✅  Deployment bucket already exists: $DEPLOY_BUCKET"
else
    echo "📦  Creating deployment bucket: $DEPLOY_BUCKET"
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
echo "🔧  Setting up .aws-sam directory..."
mkdir -p .aws-sam/build

# Step 1: Deploy Core Infrastructure
echo ""
echo "========================================"
echo " 🚀  DEPLOYING CORE INFRASTRUCTURE"
echo "========================================"
./scripts/deploy-core.sh $ENV

# Verify core stack was deployed successfully
CORE_STACK_NAME="travel-guide-core-$ENV"
for i in {1..30}; do
    CORE_STATUS=$(aws cloudformation describe-stacks --stack-name $CORE_STACK_NAME --query 'Stacks[0].StackStatus' --output text --region $REGION --profile $PROFILE 2>/dev/null || echo "FAILED")
    if [[ "$CORE_STATUS" == "CREATE_COMPLETE" ]] || [[ "$CORE_STATUS" == "UPDATE_COMPLETE" ]]; then
        echo "✅ Core stack is ready."
        break
    elif [[ "$CORE_STATUS" == *"FAILED"* ]] || [[ "$CORE_STATUS" == *"ROLLBACK"* ]]; then
        echo "❌ Core stack deployment failed with status: $CORE_STATUS"
        exit 1
    fi
    echo "⏳ Waiting for core stack to be ready... ($i/30)"
    sleep 10
done

if [[ "$CORE_STATUS" != "CREATE_COMPLETE" ]] && [[ "$CORE_STATUS" != "UPDATE_COMPLETE" ]]; then
    echo "❌ Core stack deployment timed out. Status: $CORE_STATUS"
    exit 1
fi

# Step 2: Deploy Auth Service
echo ""
echo "========================================"
echo " 🚀  DEPLOYING AUTH SERVICE"
echo "========================================"
./scripts/deploy-auth.sh $ENV

# Step 3: Deploy Article Service
echo ""
echo "========================================"
echo " 🚀  DEPLOYING ARTICLE SERVICE"
echo "========================================"
./scripts/deploy-article.sh $ENV

# Step 4: Deploy Media Service
echo ""
echo "========================================"
echo " 🚀  DEPLOYING MEDIA SERVICE"
echo "========================================"
./scripts/deploy-media.sh $ENV

echo ""
echo "========================================"
echo " ✅  DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "========================================"
echo ""

# Lấy và in ra các output
echo "🔗  API Endpoints:"
AUTH_API_URL=$(aws cloudformation describe-stacks --stack-name "travel-guide-auth-service-$ENV" --query 'Stacks[0].Outputs[?OutputKey==`AuthApiUrl`].OutputValue' --output text --region $REGION --profile $PROFILE 2>/dev/null || echo "Not Found")
ARTICLE_API_URL=$(aws cloudformation describe-stacks --stack-name "travel-guide-article-service-$ENV" --query 'Stacks[0].Outputs[?OutputKey==`ArticleApiUrl`].OutputValue' --output text --region $REGION --profile $PROFILE 2>/dev/null || echo "Not Found")

echo "Auth API: $AUTH_API_URL"
echo "Article API: $ARTICLE_API_URL"
echo ""

echo "🌐  CloudFront Domain:"
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks --stack-name $CORE_STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' --output text --region $REGION --profile $PROFILE 2>/dev/null || echo "Not Found")
echo "$CLOUDFRONT_DOMAIN"
echo ""

echo "💾  S3 Buckets:"
STATIC_BUCKET=$(aws cloudformation describe-stacks --stack-name $CORE_STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`StaticSiteBucketName`].OutputValue' --output text --region $REGION --profile $PROFILE 2>/dev/null || echo "Not Found")
IMAGE_BUCKET=$(aws cloudformation describe-stacks --stack-name $CORE_STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ArticleImagesBucketName`].OutputValue' --output text --region $REGION --profile $PROFILE 2>/dev/null || echo "Not Found")
echo "Static Site: $STATIC_BUCKET"
echo "Article Images: $IMAGE_BUCKET"