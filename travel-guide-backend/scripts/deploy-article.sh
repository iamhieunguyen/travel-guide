#!/usr/bin/env bash
set -euo pipefail

###################################
# Travel Guide - Deploy Article   #
###################################

cleanup() {
  local exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    echo ""
    echo "========================================"
    echo " 🚨  DEPLOY ARTICLE SERVICE FAILED"
    echo "========================================"
    echo "Exit code : $exit_code"
    echo "Last cmd  : ${BASH_COMMAND}"
    echo ""
    read -p "Press Enter to exit..."
  fi
}
trap cleanup ERR EXIT

log()  { echo -e "[$(date '+%H:%M:%S')] $*"; }
fail() { echo -e " ❌  $*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

ENV="${1:-staging}"
REGION="${2:-us-east-1}"
PROFILE="${3:-default}"
CORE_STACK_NAME="${4:-travel-guide-core-$ENV}"

SERVICE_NAME="article-service"
STACK_NAME="travel-guide-$SERVICE_NAME-$ENV"
SERVICE_DIR="$ROOT_DIR/services/$SERVICE_NAME"
TEMPLATE_FILE="$SERVICE_DIR/template.yaml"
PARAM_FILE="$SERVICE_DIR/parameters/$ENV.json"

log " 🚢  Deploy ARTICLE SERVICE"
log "  ENV     : $ENV"
log "  REGION  : $REGION"
log "  PROFILE : $PROFILE"
log "  STACK   : $STACK_NAME"
log "  CORE STACK : $CORE_STACK_NAME"
log "  DIR     : $SERVICE_DIR"
log "  TEMPLATE: $TEMPLATE_FILE"
log "  PARAMS  : $PARAM_FILE"
echo ""

command -v aws >/dev/null 2>&1 || fail "AWS CLI not found. Please install it."
command -v sam >/dev/null 2>&1 || fail "SAM CLI not found. Please install it."
[[ -d "$SERVICE_DIR"    ]] || fail "Service directory not found: $SERVICE_DIR"
[[ -f "$TEMPLATE_FILE"  ]] || fail "Template file not found: $TEMPLATE_FILE"
[[ -f "$PARAM_FILE"     ]] || fail "Parameters file not found: $PARAM_FILE"

# Create parameters directory if it doesn't exist
mkdir -p "$SERVICE_DIR/parameters"

# Create default parameters file if it doesn't exist
if [[ ! -f "$PARAM_FILE" ]]; then
  log " ⚙️   Creating default parameters file..."
  cat > "$PARAM_FILE" <<EOF
{
  "CoreStackName": "$CORE_STACK_NAME",
  "Environment": "$ENV",
  "CorsOrigin": "*"
}
EOF
fi

log " 🔧  sam build (article-service)..."
pushd "$SERVICE_DIR" >/dev/null
sam build --use-container
popd >/dev/null

echo ""
log " 🚢  sam deploy (article-service)..."
sam deploy \
  --stack-name "$STACK_NAME" \
  --template-file "$SERVICE_DIR/.aws-sam/build/template.yaml" \
  --region "$REGION" \
  --profile "$PROFILE" \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --parameter-overrides "CoreStackName=$CORE_STACK_NAME" "Environment=$ENV" "CorsOrigin=*" \
  --tags Environment=$ENV Service=article

log " ✅  ARTICLE SERVICE deployed successfully"
echo ""