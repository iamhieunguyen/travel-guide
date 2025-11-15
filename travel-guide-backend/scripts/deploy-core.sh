#!/bin/bash
set -e  # Exit on any error

# Configuration
ENV=${1:-staging}
CORE_STACK_NAME="travel-guide-core-$ENV"
REGION=${AWS_REGION:-us-east-1}
PROFILE=${AWS_PROFILE:-default}

echo "🚀 Deploying Core Infrastructure to $ENV environment"
echo "   Stack Name: $CORE_STACK_NAME"
echo "   Region: $REGION"
echo "   Profile: $PROFILE"
echo ""

# Step 1: Package the application
echo "📦 Packaging core infrastructure..."
sam package \
  --template-file core-infra/template.yaml \
  --output-template-file .aws-sam/build/core-infra-packaged.yaml \
  --s3-bucket travel-guide-deployment-$ENV-$(aws sts get-caller-identity --query 'Account' --output text) \
  --s3-prefix core-infra \
  --region $REGION \
  --profile $PROFILE

# Step 2: Deploy the stack
echo "🚀 Deploying core infrastructure stack..."
sam deploy \
  --template-file .aws-sam/build/core-infra-packaged.yaml \
  --stack-name $CORE_STACK_NAME \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --parameter-overrides \
    Environment=$ENV \
    CorsOrigin=$(cat core-infra/parameters/$ENV.json | jq -r '.CorsOrigin') \
  --region $REGION \
  --profile $PROFILE \
  --no-fail-on-empty-changeset

# Step 3: Get stack outputs
echo ""
echo "✅ Core Infrastructure deployed successfully!"
echo ""
echo "📋 Stack Outputs:"
aws cloudformation describe-stacks \
  --stack-name $CORE_STACK_NAME \
  --query 'Stacks[0].Outputs' \
  --region $REGION \
  --profile $PROFILE