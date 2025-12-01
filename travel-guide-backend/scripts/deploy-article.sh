#!/bin/bash
set -e

# Trap errors to prevent window from closing immediately
cleanup() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo ""
    echo "========================================"
    echo "🚨 ARTICLE SERVICE DEPLOYMENT FAILED"
    echo "========================================"
    echo "Error code: $exit_code"
    echo "Command that failed: ${BASH_COMMAND}"
    echo ""
    echo "🔍 DEBUGGING TIPS:"
    echo "1. Check if core stack deployed successfully"
    echo "2. Validate your template.yaml file for syntax errors"
    echo "3. Check if all required dependencies are installed"
    echo "4. Look for error details in the output above"
    echo ""
    read -p "Press Enter to exit..."
  fi
}
trap cleanup ERR EXIT

ENV=${1:-staging}
REGION=${2:-us-east-1}
PROFILE=${3:-default}
CORE_STACK_NAME="travel-guide-core-$ENV"

STACK_NAME="travel-guide-article-service-$ENV"
TEMPLATE_FILE="services/article-service/template.yaml"
PARAMS_FILE="services/article-service/parameters/$ENV.json"

# Create parameters file if it doesn't exist
if [ ! -f "$PARAMS_FILE" ]; then
    echo "⚙️  Creating parameters file for Article Service..."
    mkdir -p services/article-service/parameters
    cat > $PARAMS_FILE <<EOF
{
  "CoreStackName": "$CORE_STACK_NAME",
  "Environment": "$ENV",
  "CorsOrigin": "*"
}
EOF
    echo "✅  Parameters file created at $PARAMS_FILE"
fi

echo "📦  Preparing to deploy Article Service stack: $STACK_NAME"

# Package Lambda functions and layers
echo "📦  Packaging Lambda functions and layers..."

# Check if sam is installed
if ! command -v sam &> /dev/null; then
    echo "❌ AWS SAM CLI is not installed. Please install it first."
    echo "Refer to: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
    exit 1
fi

# Package the template
sam package \
    --template-file $TEMPLATE_FILE \
    --output-template-file .aws-sam/build/article-service-packaged.yaml \
    --s3-bucket travel-guide-deployment-$ENV-$(aws sts get-caller-identity --query 'Account' --output text --profile $PROFILE) \
    --region $REGION \
    --profile $PROFILE

# Validate template
echo "✅  Validating CloudFormation template..."
aws cloudformation validate-template \
    --template-body file://.aws-sam/build/article-service-packaged.yaml \
    --region $REGION \
    --profile $PROFILE &>/dev/null || (echo "❌ Template validation failed"; exit 1)

echo "✅  Template validated successfully"

# Deploy stack
echo "🚀  Deploying Article Service stack..."
aws cloudformation deploy \
    --stack-name $STACK_NAME \
    --template-file .aws-sam/build/article-service-packaged.yaml \
    --parameter-overrides file://$PARAMS_FILE \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION \
    --profile $PROFILE \
    --no-fail-on-empty-changeset

echo "✅  Article Service stack deployed successfully"
echo ""