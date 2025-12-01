#!/usr/bin/env bash
set -euo pipefail

#################################
# Travel Guide - Deploy Auth    #
#################################

cleanup() {
  local exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    echo ""
    echo "========================================"
    echo "🚨 DEPLOY AUTH SERVICE FAILED"
    echo "========================================"
    echo "Exit code : $exit_code"
    echo "Last cmd  : ${BASH_COMMAND}"
    echo ""
    read -p "Press Enter to exit..."
  fi
}
trap cleanup EXIT

log()  { echo -e "[$(date '+%H:%M:%S')] $*"; }
fail() { echo -e "❌ $*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Parameters: ENV REGION PROFILE DEPLOY_BUCKET
ENV="${1:-staging}"
REGION="${2:-us-east-1}"
PROFILE="${3:-default}"
# S3 bucket for uploading code + layers (us-east-1)
DEPLOY_BUCKET="${4:-travel-guide-deployment-staging-336468391794}"

SERVICE_NAME="auth"
STACK_NAME="travel-guide-${SERVICE_NAME}-${ENV}"
SERVICE_DIR="$ROOT_DIR/services/${SERVICE_NAME}-service"
TEMPLATE_FILE="$SERVICE_DIR/template.yaml"

# CloudFormation parameters
CORE_STACK_NAME="travel-guide-core-$ENV"
ENVIRONMENT="$ENV"
CORS_ORIGIN="*"

log "🚢 Deploy AUTH SERVICE"
log "  ENV          : $ENVIRONMENT"
log "  REGION       : $REGION"
log "  PROFILE      : $PROFILE"
log "  STACK        : $STACK_NAME"
log "  SERVICE DIR  : $SERVICE_DIR"
log "  TEMPLATE     : $TEMPLATE_FILE"
log "  DEPLOY BUCKET: $DEPLOY_BUCKET"
echo ""

command -v sam >/dev/null 2>&1 || fail "'sam' CLI not found"

[[ -d "$SERVICE_DIR"   ]] || fail "Service directory not found: $SERVICE_DIR"
[[ -f "$TEMPLATE_FILE" ]] || fail "Template file not found: $TEMPLATE_FILE"

log "🔧 sam build (auth-service)..."
pushd "$SERVICE_DIR" >/dev/null
sam build 
popd >/dev/null
echo ""

log "🔄 Parameter overrides:"
echo "    - CoreStackName=$CORE_STACK_NAME"
echo "    - Environment=$ENVIRONMENT"
echo "    - CorsOrigin=$CORS_ORIGIN"
echo ""

log "🔍 Checking current stack status..."
STACK_STATUS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --profile "$PROFILE" \
  --query 'Stacks[0].StackStatus' \
  --output text 2>/dev/null || echo "NOT_EXISTS")

if [[ "$STACK_STATUS" == "ROLLBACK_COMPLETE" ]]; then
  log "⚠️  Stack is in ROLLBACK_COMPLETE state"
  log "🗑️  Deleting old stack before redeploying..."
  aws cloudformation delete-stack \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --profile "$PROFILE"
  
  log "⏳ Waiting for stack to be completely deleted..."
  aws cloudformation wait stack-delete-complete \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --profile "$PROFILE"
  
  log "✅ Stack has been deleted"
  echo ""
fi

log "🚢 sam deploy (auth-service) with --s3-bucket $DEPLOY_BUCKET..."
sam deploy \
  --stack-name "$STACK_NAME" \
  --template-file "$TEMPLATE_FILE" \
  --region "$REGION" \
  --profile "$PROFILE" \
  --s3-bucket "$DEPLOY_BUCKET" \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    CoreStackName="$CORE_STACK_NAME" \
    Environment="$ENVIRONMENT" \
    CorsOrigin="$CORS_ORIGIN"

log "✅ AUTH SERVICE deployed successfully"
