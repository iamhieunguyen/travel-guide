#!/bin/bash

# Run all migration scripts in order
# Usage: ./run_all_migrations.sh

set -e  # Exit on error

echo "============================================================"
echo "RUNNING ALL MIGRATIONS"
echo "============================================================"
echo ""

# Check if environment variables are set
if [ -z "$TABLE_NAME" ]; then
    echo "❌ Error: TABLE_NAME environment variable not set"
    echo "   Example: export TABLE_NAME=travel-guided-ArticlesTable-XXXXXXXXX"
    exit 1
fi

if [ -z "$AWS_REGION" ]; then
    echo "❌ Error: AWS_REGION environment variable not set"
    echo "   Example: export AWS_REGION=ap-southeast-1"
    exit 1
fi

echo "Configuration:"
echo "  TABLE_NAME: $TABLE_NAME"
echo "  AWS_REGION: $AWS_REGION"
echo ""

# Confirm before running
read -p "Continue with all migrations? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Migrations cancelled."
    exit 0
fi

echo ""
echo "============================================================"
echo "STEP 1/3: Running ownerId migration (CRITICAL)"
echo "============================================================"
echo ""
python migrate_ownerid.py

echo ""
echo "============================================================"
echo "STEP 2/3: Running lowercase fields migration"
echo "============================================================"
echo ""
python migrate_lowercase.py

echo ""
echo "============================================================"
echo "STEP 3/3: Running locationName migration"
echo "============================================================"
echo ""
python migrate_locationname.py

echo ""
echo "============================================================"
echo "ALL MIGRATIONS COMPLETED!"
echo "============================================================"
echo ""
echo "✅ ownerId migration: Done"
echo "✅ Lowercase fields migration: Done"
echo "✅ LocationName migration: Done"
echo ""
echo "Next steps:"
echo "  1. Deploy backend: cd .. && sam build && sam deploy"
echo "  2. Deploy frontend: cd ../travel-guide-frontend && npm run build"
echo "  3. Test Personal Page"
echo ""
