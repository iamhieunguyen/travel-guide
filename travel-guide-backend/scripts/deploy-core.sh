#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

# Configuration
ENV=${1:-staging}  # Use first argument or default to 'staging'
CORE_STACK_NAME="travel-guide-core-$ENV"
REGION=${AWS_REGION:-us-east-1}  # Use environment variable or default to 'us-east-1'
PROFILE=${AWS_PROFILE:-default}   # Use environment variable or default to 'default'

echo "🚀 Deploying Core Infrastructure to $ENV environment"
echo "   Stack Name: $CORE_STACK_NAME"
echo "   Region: $REGION"
echo "   Profile: $PROFILE"
echo ""

# Validate environment parameter
if [[ "$ENV" != "staging" && "$ENV" != "prod" ]]; then
    echo "❌ Error: Environment must be 'staging' or 'prod'"
    echo "Usage: $0 [staging|prod]"
    exit 1
fi

# Create deployment directory
echo "🔧 Setting up deployment directory..."
mkdir -p .aws-sam/build

# Create deployment bucket if it doesn't exist
echo "🔧 Checking/Creating deployment bucket..."
DEPLOY_BUCKET="travel-guide-deployment-$ENV-$(aws sts get-caller-identity --query 'Account' --output text --profile $PROFILE)"

# Check if bucket exists
if aws s3 ls "s3://$DEPLOY_BUCKET" --region $REGION --profile $PROFILE &>/dev/null; then
    echo "✅ Deployment bucket already exists: $DEPLOY_BUCKET"
else
    echo "📦 Creating deployment bucket: $DEPLOY_BUCKET"
    if [[ "$REGION" == "us-east-1" ]]; then
        # us-east-1 is special case - no LocationConstraint required
        aws s3api create-bucket \
            --bucket $DEPLOY_BUCKET \
            --region $REGION \
            --profile $PROFILE
    else
        aws s3api create-bucket \
            --bucket $DEPLOY_BUCKET \
            --region $REGION \
            --create-bucket-configuration LocationConstraint=$REGION \
            --profile $PROFILE
    fi
fi

# Package the application
echo "📦 Packaging core infrastructure..."
sam package \
  --template-file core-infra/template.yaml \
  --output-template-file .aws-sam/build/core-infra-packaged.yaml \
  --s3-bucket $DEPLOY_BUCKET \
  --s3-prefix core-infra \
  --region $REGION \
  --profile $PROFILE

# Deploy the stack
echo "🚀 Deploying core infrastructure stack..."
sam deploy \
  --template-file .aws-sam/build/core-infra-packaged.yaml \
  --stack-name $CORE_STACK_NAME \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --parameter-overrides \
    Environment=$ENV \
    CorsOrigin=$(cat core-infra/parameters/$ENV.json | jq -r '.CorsOrigin' 2>/dev/null || echo '"*"') \
  --region $REGION \
  --profile $PROFILE \
  --no-fail-on-empty-changeset

# Wait a bit for the stack to be fully ready
echo "⏳ Waiting for stack to be ready..."
sleep 5

# Get and display stack outputs
echo ""
echo "✅ Core Infrastructure deployed successfully!"
echo ""
echo "📋 Stack Information:"
echo "Stack Name: $CORE_STACK_NAME"
echo "Stack Status: $(aws cloudformation describe-stacks --stack-name $CORE_STACK_NAME --query 'Stacks[0].StackStatus' --output text --region $REGION --profile $PROFILE)"
echo ""
echo "🔗 Stack Outputs:"

# Display all outputs in a readable format
OUTPUTS_JSON=$(aws cloudformation describe-stacks --stack-name $CORE_STACK_NAME --query 'Stacks[0].Outputs' --output json --region $REGION --profile $PROFILE)

if [[ "$OUTPUTS_JSON" != "null" ]]; then
    echo "$OUTPUTS_JSON" | jq -r '.[] | "  - \(.OutputKey): \(.OutputValue)"'
else
    echo "  No outputs found"
fi

# Additional information
echo ""
echo "💡 Next steps:"
echo "  - To deploy auth service: ./scripts/deploy-auth.sh $ENV"
echo "  - To deploy article service: ./scripts/deploy-article.sh $ENV"
echo "  - To deploy media service: ./scripts/deploy-media.sh $ENV"
echo ""
echo "🔧 You can also run all services at once: ./scripts/deploy-all.sh $ENV"