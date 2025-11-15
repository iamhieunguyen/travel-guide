#!/bin/bash
set -e  # Exit on any error

# Configuration
ENV=${1:-staging}
CORE_STACK_NAME="travel-guide-core-$ENV"
MEDIA_STACK_NAME="travel-guide-media-service-$ENV"
REGION=${AWS_REGION:-us-east-1}
PROFILE=${AWS_PROFILE:-default}

echo "🚀 Deploying Media Service to $ENV environment"
echo "   Core Stack: $CORE_STACK_NAME"
echo "   Target Stack: $MEDIA_STACK_NAME"
echo "   Region: $REGION"
echo "   Profile: $PROFILE"
echo ""

# Step 1: Package the application
echo "📦 Packaging media service..."
sam package \
  --template-file services/media-service/template.yaml \
  --output-template-file .aws-sam/build/media-service-packaged.yaml \
  --s3-bucket travel-guide-deployment-$ENV-$(aws sts get-caller-identity --query 'Account' --output text) \
  --s3-prefix media-service \
  --region $REGION \
  --profile $PROFILE

# Step 2: Deploy the stack
echo "🚀 Deploying media service stack..."
sam deploy \
  --template-file .aws-sam/build/media-service-packaged.yaml \
  --stack-name $MEDIA_STACK_NAME \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --parameter-overrides \
    CoreStackName=$CORE_STACK_NAME \
    Environment=$ENV \
  --region $REGION \
  --profile $PROFILE \
  --no-fail-on-empty-changeset

echo ""
echo "✅ Media Service deployed successfully!"