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
    read -p "Nhấn [ENTER] để thoát..."
  fi
}
trap cleanup EXIT

log()  { echo -e "[$(date '+%H:%M:%S')] $*"; }
fail() { echo -e "❌ $*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Tham số: ENV REGION PROFILE BUCKET
ENV="${1:-staging}"
REGION="${2:-us-east-1}"
PROFILE="${3:-default}"
# Bucket S3 dùng để upload code + layer (us-east-1)
DEPLOY_BUCKET="${4:-travel-guide-deployment-staging-336468391794}"

SERVICE_NAME="auth"
STACK_NAME="travel-guide-${SERVICE_NAME}-${ENV}"
SERVICE_DIR="$ROOT_DIR/services/${SERVICE_NAME}-service"
TEMPLATE_FILE="$SERVICE_DIR/template.yaml"

# Tham số CloudFormation
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

command -v sam >/dev/null 2>&1 || fail "Không tìm thấy 'sam' CLI"

[[ -d "$SERVICE_DIR"   ]] || fail "Không tìm thấy service dir: $SERVICE_DIR"
[[ -f "$TEMPLATE_FILE" ]] || fail "Không tìm thấy template: $TEMPLATE_FILE"

log "🔧 sam build (auth-service) với Docker..."
pushd "$SERVICE_DIR" >/dev/null
sam build --use-container
popd >/dev/null
echo ""

log "🔄 Parameter overrides:"
echo "    - CoreStackName=$CORE_STACK_NAME"
echo "    - Environment=$ENVIRONMENT"
echo "    - CorsOrigin=$CORS_ORIGIN"
echo ""

log "🚢 sam deploy (auth-service) với --s3-bucket $DEPLOY_BUCKET..."
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

log "✅ AUTH SERVICE deploy thành công"
