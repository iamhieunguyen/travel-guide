#!/bin/bash
set -e

# Trap errors to prevent window from closing immediately
cleanup() {
  echo ""
  read -p "Debug session completed. Press Enter to exit..."
}
trap cleanup EXIT

echo "🔍🔍🔍  DEPLOYMENT DEBUGGER  🔍🔍🔍"
echo "========================================"
echo ""

# Check AWS CLI installation and version
echo "1. Checking AWS CLI installation..."
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed."
    echo "💡 Install from: https://aws.amazon.com/cli/"
    exit 1
else
    echo "✅ AWS CLI is installed"
    aws --version
fi
echo ""

# Check AWS SAM CLI installation
echo "2. Checking AWS SAM CLI installation..."
if ! command -v sam &> /dev/null; then
    echo "⚠️  AWS SAM CLI is not installed."
    echo "💡 Install from: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
else
    echo "✅ AWS SAM CLI is installed"
    sam --version
fi
echo ""

# Check AWS credentials and configuration
echo "3. Checking AWS credentials..."
if aws sts get-caller-identity &> /dev/null; then
    echo "✅ AWS credentials are valid"
    aws sts get-caller-identity
else
    echo "❌ AWS credentials are invalid or not configured"
    echo "💡 Configure credentials with: aws configure"
    exit 1
fi
echo ""

# Check template files
echo "4. Checking template files..."
TEMPLATE_FILES=(
    "core-infra/template.yaml"
    "services/auth-service/template.yaml"
    "services/article-service/template.yaml"
    "services/media-service/template.yaml"
)

for template in "${TEMPLATE_FILES[@]}"; do
    echo "   - Checking $template..."
    if [ -f "$template" ]; then
        echo "     ✅ File exists"
        # Try to parse the YAML file
        if python3 -c "import yaml; yaml.safe_load(open('$template'))" &> /dev/null; then
            echo "     ✅ Valid YAML syntax"
        else
            echo "     ❌ Invalid YAML syntax"
        fi
    else
        echo "     ❌ File not found"
    fi
done
echo ""

# Check Lambda function files
echo "5. Checking Lambda function files..."
FUNCTION_DIRS=(
    "services/auth-service/functions"
    "services/article-service/functions"
    "services/media-service/functions"
)

for dir in "${FUNCTION_DIRS[@]}"; do
    echo "   - Checking $dir..."
    if [ -d "$dir" ]; then
        echo "     ✅ Directory exists"
        echo "     Functions found:"
        find "$dir" -name "*.py" -exec basename {} \;
    else
        echo "     ❌ Directory not found"
    fi
done
echo ""

# Check existing stacks
echo "6. Checking existing CloudFormation stacks..."
STACKS=(
    "travel-guide-core-staging"
    "travel-guide-auth-service-staging"
    "travel-guide-article-service-staging"
    "travel-guide-media-service-staging"
)

for stack in "${STACKS[@]}"; do
    echo "   - Checking $stack..."
    if aws cloudformation describe-stacks --stack-name "$stack" &> /dev/null; then
        STATUS=$(aws cloudformation describe-stacks --stack-name "$stack" --query 'Stacks[0].StackStatus' --output text)
        echo "     ✅ Stack exists - Status: $STATUS"
    else
        echo "     ⭕ Stack does not exist or inaccessible"
    fi
done
echo ""

# Check template files
echo "4. Checking template files..."
TEMPLATE_FILES=(
    "core-infra/template.yaml"
    "services/auth-service/template.yaml"
    "services/article-service/template.yaml"
    "services/media-service/template.yaml"
    "services/ai-service/template.yaml"
)

for template in "${TEMPLATE_FILES[@]}"; do
    echo "   - Checking $template..."
    if [ -f "$template" ]; then
        echo "     ✅ File exists"
        # Try to parse the YAML file
        if python3 -c "import yaml; yaml.safe_load(open('$template'))" &> /dev/null; then
            echo "     ✅ Valid YAML syntax"
        else
            echo "     ❌ Invalid YAML syntax"
        fi
    else
        echo "     ❌ File not found"
    fi
done
echo ""

# Check S3 deployment bucket
echo "7. Checking S3 deployment bucket..."
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
DEPLOY_BUCKET="travel-guide-deployment-staging-$ACCOUNT_ID"

if aws s3 ls "s3://$DEPLOY_BUCKET" &> /dev/null; then
    echo "✅ Deployment bucket exists: $DEPLOY_BUCKET"
    echo "   Contents:"
    aws s3 ls "s3://$DEPLOY_BUCKET" --recursive
else
    echo "⭕ Deployment bucket does not exist: $DEPLOY_BUCKET"
    echo "💡 It will be created automatically during deployment"
fi
echo ""

echo "========================================"
echo "✅ DEBUGGING COMPLETE"
echo "========================================"
echo ""
echo "💡 RECOMMENDATIONS:"
echo "1. If any checks failed, address them before deploying"
echo "2. For YAML syntax errors, use a YAML validator or IDE with YAML support"
echo "3. For missing files, check your repository structure"
echo "4. For credential issues, run 'aws configure' with your credentials"
echo ""
echo "🔍 To get more detailed CloudFormation errors:"
echo "   aws cloudformation describe-stack-events --stack-name <stack-name> --query 'StackEvents[0:10]'"
echo ""