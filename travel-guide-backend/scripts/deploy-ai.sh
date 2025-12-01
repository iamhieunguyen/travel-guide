#!/usr/bin/env bash
set -euo pipefail

################################
# Travel Guide - Deploy AI     #
################################

cleanup() {
  local exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    echo ""
    echo "========================================"
    echo "🚨 DEPLOY AI SERVICE FAILED"
    echo "========================================"
    echo "Exit code : $exit_code"
    echo "Last cmd  : ${BASH_COMMAND}"
    echo ""
  fi
}
trap cleanup EXIT

log()  { echo -e "[$(date '+%H:%M:%S')] $*"; }
fail() { echo -e "❌ $*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

ENV="${1:-${ENV:-staging}}"
REGION="${AWS_REGION:-ap-southeast-1}"
PROFILE="${AWS_PROFILE:-default}"

SERVICE_NAME="ai"
STACK_NAME="travel-guide-${SERVICE_NAME}-${ENV}"
SERVICE_DIR="$ROOT_DIR/services/${SERVICE_NAME}-service"
TEMPLATE_FILE="$SERVICE_DIR/template.yaml"
PARAM_FILE="$SERVICE_DIR/parameters/${ENV}.json"

log "🚢 Deploy AI SERVICE"
log "  ENV     : $ENV"
log "  REGION  : $REGION"
log "  PROFILE : $PROFILE"
log "  STACK   : $STACK_NAME"
log "  DIR     : $SERVICE_DIR"
log "  TEMPLATE: $TEMPLATE_FILE"
log "  PARAMS  : $PARAM_FILE"
echo ""

command -v aws >/dev/null 2>&1 || fail "Không tìm thấy 'aws' CLI"
command -v sam >/dev/null 2>&1 || fail "Không tìm thấy 'sam' CLI"

[[ -d "$SERVICE_DIR"    ]] || fail "Không tìm thấy service dir: $SERVICE_DIR"
[[ -f "$TEMPLATE_FILE"  ]] || fail "Không tìm thấy template: $TEMPLATE_FILE"
[[ -f "$PARAM_FILE"     ]] || fail "Không tìm thấy params: $PARAM_FILE"

params_from_json() {
  local param_file="$1"
  if command -v jq >/dev/null 2>&1; then
    jq -r 'to_entries | map("\(.key)=\(.value|tostring)") | .[]' "$param_file"
  elif command -v python3 >/dev/null 2>&1; then
    python3 - <<PY
import json
from pathlib import Path
data = json.loads(Path("$param_file").read_text(encoding="utf-8"))
print("\\n".join(f"{k}={v}" for k, v in data.items()))
PY
  else
    fail "Cần có 'jq' hoặc 'python3' để convert parameters."
  fi
}

log "🔧 sam build (ai-service)..."
pushd "$SERVICE_DIR" >/dev/null
sam build --use-container
popd >/dev/null
echo ""

log "🔄 Convert parameters..."
PARAM_OVERRIDES="$(params_from_json "$PARAM_FILE")"
echo "$PARAM_OVERRIDES" | sed 's/^/    - /'
echo ""

log "🚢 sam deploy (ai-service)..."
sam deploy \
  --stack-name "$STACK_NAME" \
  --template-file "$TEMPLATE_FILE" \
  --region "$REGION" \
  --profile "$PROFILE" \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --parameter-overrides $PARAM_OVERRIDES

log "✅ AI SERVICE deploy thành công"
