#!/bin/bash
set -e

# Trap errors to prevent window from closing immediately
cleanup() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo ""
    echo "========================================"
    echo "🚨 CORE INFRASTRUCTURE DEPLOYMENT FAILED"
    echo "========================================"
    echo "Error code: $exit_code"
    echo "Command that failed: ${BASH_COMMAND}"
    echo ""
    echo "💡 SOLUTIONS:"
    echo "1. Check template.yaml for syntax errors (use a YAML validator)"
    echo "2. Verify your AWS credentials are valid"
    echo "3. Check if your AWS account has sufficient permissions"
    echo "4. Ensure your AWS region is correct"
    echo ""
    read -p "Press Enter to exit..."
  fi
}
trap cleanup ERR EXIT

ENV=${1:-staging}
REGION=${2:-us-east-1}
PROFILE=${3:-default}
TEMPLATE_FILE="core-infra/template.yaml"
PARAMS_FILE="core-infra/parameters/$ENV.json"

echo "📦  Preparing to deploy Core Infrastructure stack: travel-guide-core-$ENV"

# Create parameters file if it doesn't exist
if [ ! -f "$PARAMS_FILE" ]; then
    echo "⚙️  Creating parameters file for Core Infrastructure..."
    mkdir -p core-infra/parameters
    cat > $PARAMS_FILE <<EOF
{
  "Environment": "$ENV",
  "CorsOrigin": "*"
}
EOF
    echo "✅  Parameters file created at $PARAMS_FILE"
fi

# Validate template
echo "✅  Validating CloudFormation template..."
if ! aws cloudformation validate-template --template-body file://$TEMPLATE_FILE --region $REGION --profile $PROFILE &>/dev/null; then
    echo "❌ Template validation failed. Please check for syntax errors."
    echo "💡 You can validate your YAML using: https://yamlchecker.com/"
    exit 1
fi

echo "✅  Template validated successfully"

# Convert JSON parameters to Key=Value format
if command -v python &> /dev/null; then
    echo "🔄  Converting parameters to Key=Value format using Python..."
    params_override=$(python -c "import json, sys; data=json.load(sys.stdin); print(' '.join([f'{k}={v}' for k,v in data.items()]))" < $PARAMS_FILE)
else
    echo "⚠️  Python not found. Using basic parameter conversion..."
    # Simple conversion for basic JSON
    params_override=$(cat $PARAMS_FILE | tr -d ' \n{}"')
    params_override=$(echo $params_override | sed 's/:/=/g' | sed 's/,/ /g')
fi

# Check if parameters conversion was successful
if [ -z "$params_override" ]; then
    echo "❌ Failed to convert parameters. Please check your parameters file."
    echo "File content:"
    cat $PARAMS_FILE
    exit 1
fi

# Check if stack exists
STACK_EXISTS=$(aws cloudformation describe-stacks \
    --stack-name travel-guide-core-$ENV \
    --region $REGION \
    --profile $PROFILE \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [[ "$STACK_EXISTS" == "DOES_NOT_EXIST" ]]; then
    echo "🆕  Creating new stack: travel-guide-core-$ENV"
    DEPLOY_COMMAND="create-stack"
else
    echo "🔄  Updating existing stack: travel-guide-core-$ENV (current status: $STACK_EXISTS)"
    DEPLOY_COMMAND="update-stack"
fi

# Deploy stack - THIS IS THE KEY FIX
if [[ "$DEPLOY_COMMAND" == "create-stack" ]]; then
    aws cloudformation create-stack \
        --stack-name travel-guide-core-$ENV \
        --template-body file://$TEMPLATE_FILE \
        --parameters $params_override \
        --capabilities CAPABILITY_NAMED_IAM \
        --region $REGION \
        --profile $PROFILE
else
    aws cloudformation update-stack \
        --stack-name travel-guide-core-$ENV \
        --template-body file://$TEMPLATE_FILE \
        --parameters $params_override \
        --capabilities CAPABILITY_NAMED_IAM \
        --region $REGION \
        --profile $PROFILE || (echo "ℹ️  No updates to perform" && exit 0)
fi

echo "⏳  Waiting for stack to complete..."
aws cloudformation wait stack-create-complete \
    --stack-name travel-guide-core-$ENV \
    --region $REGION \
    --profile $PROFILE 2>/dev/null || \
aws cloudformation wait stack-update-complete \
    --stack-name travel-guide-core-$ENV \
    --region $REGION \
    --profile $PROFILE

echo "✅  Core Infrastructure stack deployed successfully"
echo ""