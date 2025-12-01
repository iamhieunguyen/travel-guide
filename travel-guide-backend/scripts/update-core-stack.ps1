# Update Core Stack - PowerShell Script
param(
    [string]$Environment = "staging",
    [string]$Region = "us-east-1",
    [string]$Profile = "default"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  UPDATE CORE INFRASTRUCTURE STACK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host "Profile: $Profile" -ForegroundColor Yellow
Write-Host ""

$StackName = "travel-guide-core-$Environment"
$TemplateFile = "core-infra/template.yaml"

# Check if template exists
if (-not (Test-Path $TemplateFile)) {
    Write-Host "❌ Template file not found: $TemplateFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Template file found" -ForegroundColor Green

# Validate template
Write-Host "🔍 Validating template..." -ForegroundColor Cyan
try {
    aws cloudformation validate-template `
        --template-body "file://$TemplateFile" `
        --region $Region `
        --profile $Profile | Out-Null
    Write-Host "✅ Template is valid" -ForegroundColor Green
} catch {
    Write-Host "❌ Template validation failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Update stack
Write-Host ""
Write-Host "🚀 Updating stack: $StackName" -ForegroundColor Cyan
try {
    aws cloudformation update-stack `
        --stack-name $StackName `
        --template-body "file://$TemplateFile" `
        --parameters "ParameterKey=Environment,ParameterValue=$Environment" "ParameterKey=CorsOrigin,ParameterValue=*" `
        --capabilities CAPABILITY_NAMED_IAM `
        --region $Region `
        --profile $Profile
    
    Write-Host "⏳ Waiting for stack update to complete..." -ForegroundColor Yellow
    Write-Host "   This may take 2-5 minutes..." -ForegroundColor Gray
    
    aws cloudformation wait stack-update-complete `
        --stack-name $StackName `
        --region $Region `
        --profile $Profile
    
    Write-Host ""
    Write-Host "✅ Core stack updated successfully!" -ForegroundColor Green
    
} catch {
    if ($_.Exception.Message -like "*No updates are to be performed*") {
        Write-Host "ℹ️  No updates needed - stack is already up to date" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Stack update failed" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        exit 1
    }
}

# Show new outputs
Write-Host ""
Write-Host "📋 Stack Outputs (Queue-related):" -ForegroundColor Cyan
aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --profile $Profile `
    --query "Stacks[0].Outputs[?contains(OutputKey, 'Queue') || contains(OutputKey, 'DLQ')]" `
    --output table

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ CORE STACK UPDATE COMPLETED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Deploy media service: .\scripts\deploy-media.sh staging" -ForegroundColor White
Write-Host "2. Deploy AI service: .\scripts\deploy-ai.sh staging" -ForegroundColor White
Write-Host ""
