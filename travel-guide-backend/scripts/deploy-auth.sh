#!/bin/bash
set -e  # Exit on any error

# Configuration
ENV=${1:-staging}
CORE_STACK_NAME="travel-guide-core-$ENV"
AUTH_STACK_NAME="travel-guide-auth-service-$ENV"
REGION=${AWS_REGION:-us-east-1}
PROFILE=${AWS_PROFILE:-default}

echo "🚀 Deploying Auth Service to $ENV environment"
echo "   Core Stack: $CORE_STACK_NAME"
echo "   Target Stack: $AUTH_STACK_NAME"
echo "   Region: $REGION"
echo "   Profile: $PROFILE"
echo ""

# Step 1: Package the application
echo "📦 Packaging auth service..."
sam package \
  --template-file services/auth-service/template.yaml \
  --output-template-file .aws-sam/build/auth-service-packaged.yaml \
  --s3-bucket travel-guide-deployment-$ENV-$(aws sts get-caller-identity --query 'Account' --output text) \
  --s3-prefix auth-service \
  --region $REGION \
  --profile $PROFILE

# Step 2: Deploy the stack
echo "🚀 Deploying auth service stack..."
sam deploy \
  --template-file .aws-sam/build/auth-service-packaged.yaml \
  --stack-name $AUTH_STACK_NAME \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --parameter-overrides \
    CoreStackName=$CORE_STACK_NAME \
    Environment=$ENV \
    CorsOrigin=$(cat core-infra/parameters/$ENV.json | jq -r '.CorsOrigin') \
  --region $REGION \
  --profile $PROFILE \
  --no-fail-on-empty-changeset

# Step 3: Get API URL from outputs
echo ""
echo "✅ Auth Service deployed successfully!"
echo ""
echo "🔗 API Endpoint:"
aws cloudformation describe-stacks \
  --stack-name $AUTH_STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`AuthApiUrl`].OutputValue' \
  --output text \
  --region $REGION \
  --profile $PROFILE