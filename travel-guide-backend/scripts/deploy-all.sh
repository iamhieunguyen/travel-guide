#!/bin/bash
set -e  # Exit on any error

# Configuration
ENV=${1:-staging}
REGION=${AWS_REGION:-us-east-1}
PROFILE=${AWS_PROFILE:-default}

echo "🚀🚀🚀 DEPLOYING TRAVEL GUIDE FULL STACK TO $ENV ENVIRONMENT 🚀🚀🚀"
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
echo "🔧 Setting up deployment bucket if needed..."
DEPLOY_BUCKET="travel-guide-deployment-$ENV-$(aws sts get-caller-identity --query 'Account' --output text)"
if ! aws s3 ls s3://$DEPLOY_BUCKET --region $REGION --profile $PROFILE 2>/dev/null; then
    echo "Creating deployment bucket: $DEPLOY_BUCKET"
    aws s3api create-bucket \
        --bucket $DEPLOY_BUCKET \
        --region $REGION \
        --profile $PROFILE \
        --create-bucket-configuration LocationConstraint=$REGION
fi

echo ""
echo "🔧 Setting up .aws-sam directory..."
mkdir -p .aws-sam/build

# Step 1: Deploy Core Infrastructure
echo ""
echo "========================================"
echo "🚀 DEPLOYING CORE INFRASTRUCTURE"
echo "========================================"
./scripts/deploy-core.sh $ENV

# Get Core Stack Name
CORE_STACK_NAME="travel-guide-core-$ENV"

# Step 2: Deploy Auth Service
echo ""
echo "========================================"
echo "🚀 DEPLOYING AUTH SERVICE"
echo "========================================"
./scripts/deploy-auth.sh $ENV

# Step 3: Deploy Article Service
echo ""
echo "========================================"
echo "🚀 DEPLOYING ARTICLE SERVICE"
echo "========================================"
./scripts/deploy-article.sh $ENV

# Step 4: Deploy Media Service
echo ""
echo "========================================"
echo "🚀 DEPLOYING MEDIA SERVICE"
echo "========================================"
./scripts/deploy-media.sh $ENV

echo ""
echo "========================================"
echo "✅ DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "========================================"
echo ""
echo "🔗 API Endpoints:"
echo "Auth API: $(aws cloudformation describe-stacks --stack-name travel-guide-auth-service-$ENV --query 'Stacks[0].Outputs[?OutputKey==`AuthApiUrl`].OutputValue' --output text --region $REGION --profile $PROFILE)"
echo "Article API: $(aws cloudformation describe-stacks --stack-name travel-guide-article-service-$ENV --query 'Stacks[0].Outputs[?OutputKey==`ArticleApiUrl`].OutputValue' --output text --region $REGION --profile $PROFILE)"
echo ""
echo "🌐 CloudFront Domain:"
echo "$(aws cloudformation describe-stacks --stack-name $CORE_STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' --output text --region $REGION --profile $PROFILE)"
echo ""
echo "💾 S3 Buckets:"
echo "Static Site: $(aws cloudformation describe-stacks --stack-name $CORE_STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`StaticSiteBucketName`].OutputValue' --output text --region $REGION --profile $PROFILE)"
echo "Article Images: $(aws cloudformation describe-stacks --stack-name $CORE_STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ArticleImagesBucketName`].OutputValue' --output text --region $REGION --profile $PROFILE)"