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


---

## migrate_ownerid.py ⚠️ **CRITICAL**

Adds `ownerId` field to all existing articles. **This is required for Personal Page to work!**

### Prerequisites

1. AWS credentials configured
2. Python 3.x with boto3 installed

### Usage

```bash
# Set environment variables
export TABLE_NAME=travel-guided-ArticlesTable-XXXXXXXXX
export AWS_REGION=ap-southeast-1

# Run migration
python migrate_ownerid.py
```

### What it does

- Scans all articles in DynamoDB
- Adds `ownerId` field (copied from `author` field)
- Required for `scope=mine` query to work
- Skips articles that already have ownerId

### Why is this needed?

The Personal Page uses `scope=mine` which queries the `gsi_owner_createdAt` index. Without `ownerId`, articles won't appear on Personal Page.

### Example Output

```
============================================================
OWNER ID MIGRATION
============================================================
Table: travel-guided-ArticlesTable-XXXXXXXXX
Region: ap-southeast-1
============================================================

⚠️  This will:
  - Add ownerId field to all articles
  - Copy value from 'author' field
  - Required for Personal Page to work

Continue? (yes/no): yes

🚀 Starting migration...

Processing batch of 25 items...
  ✅ Updated abc123: ownerId = user-sub-123
  ✅ Updated def456: ownerId = user-sub-456
  ⏭️  Skipping ghi789 (already has ownerId)

============================================================
MIGRATION SUMMARY
============================================================
✅ Updated:      23 articles
⏭️  Skipped:      2 articles (already have ownerId)
⚠️  No author:    0 articles (missing author)
❌ Errors:       0 articles
📊 Total:        25 articles
============================================================

✅ Migration completed successfully!
```

### Notes

- **Run this FIRST** before using Personal Page
- Safe to run multiple times
- No data loss - only adds new field

---

## migrate_locationname.py

Adds `locationName` field using reverse geocoding from coordinates.

### Prerequisites

1. AWS credentials configured
2. Python 3.x with boto3 installed
3. Internet connection (for Nominatim API)

### Usage

```bash
# Set environment variables
export TABLE_NAME=travel-guided-ArticlesTable-XXXXXXXXX
export AWS_REGION=ap-southeast-1

# Run migration
python migrate_locationname.py
```

### What it does

- Scans all articles with lat/lng coordinates
- Fetches location names from Nominatim API
- Rate limited to 1 request/second
- Adds `locationName` field

### Notes

- Takes time due to rate limiting
- Requires internet connection
- Safe to run multiple times
