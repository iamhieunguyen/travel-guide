# Migration Scripts

## migrate_lowercase.py

Adds `titleLower` and `contentLower` fields to all existing articles for case-insensitive search.

### Prerequisites

1. AWS credentials configured
2. Python 3.x with boto3 installed

### Usage

```bash
# Set environment variables
export TABLE_NAME=travel-guided-ArticlesTable-XXXXXXXXX
export AWS_REGION=ap-southeast-1

# Run migration
python migrate_lowercase.py
```

### What it does

- Scans all articles in DynamoDB
- Adds `titleLower` and `contentLower` fields
- Skips articles that already have these fields
- Shows progress and summary

### Example Output

```
============================================================
LOWERCASE FIELDS MIGRATION
============================================================
Table: travel-guided-ArticlesTable-XXXXXXXXX
Region: ap-southeast-1
============================================================

⚠️  This will update ALL articles. Continue? (yes/no): yes

🚀 Starting migration...

Processing batch of 25 items...
  ✅ Updated abc123: 'Batu Caves - Beautiful temple...'
  ✅ Updated def456: 'Sunset at beach...'
  ⏭️  Skipping ghi789 (already has lowercase fields)

============================================================
MIGRATION SUMMARY
============================================================
✅ Updated:  23 articles
⏭️  Skipped:  2 articles (already migrated)
❌ Errors:   0 articles
📊 Total:    25 articles
============================================================

✅ Migration completed successfully!
```

### Notes

- Safe to run multiple times (skips already migrated articles)
- No data loss - only adds new fields
- Can be interrupted and resumed
