"""
Reprocess old articles to generate tags using Rekognition
Sends S3 events to DetectLabelsQueue to trigger tag generation
"""
import boto3
import os
import json

# Configuration
ARTICLES_TABLE = os.environ.get('ARTICLES_TABLE', 'travel-guided-ArticlesTable-L3G1OXLHH7H')
DETECT_LABELS_QUEUE = os.environ.get('DETECT_LABELS_QUEUE', 'https://sqs.ap-southeast-1.amazonaws.com/336468391794/travel-guided-detect-labels-queue')
BUCKET_NAME = os.environ.get('BUCKET_NAME', 'travel-guided-images-336468391794')
REGION = os.environ.get('AWS_REGION', 'ap-southeast-1')

dynamodb = boto3.resource('dynamodb', region_name=REGION)
sqs = boto3.client('sqs', region_name=REGION)
articles_table = dynamodb.Table(ARTICLES_TABLE)


def reprocess_articles():
    """Find articles with images but no autoTags and trigger Rekognition"""
    print(f"Scanning {ARTICLES_TABLE} for articles to reprocess...")
    
    reprocessed = 0
    skipped_has_tags = 0
    skipped_no_image = 0
    error_count = 0
    
    # Scan all articles
    scan_kwargs = {}
    
    while True:
        response = articles_table.scan(**scan_kwargs)
        items = response.get('Items', [])
        
        print(f"\nProcessing batch of {len(items)} articles...")
        
        for item in items:
            article_id = item.get('articleId')
            auto_tags = item.get('autoTags', [])
            
            # Get image key
            image_key = None
            if item.get('imageKeys') and len(item['imageKeys']) > 0:
                image_key = item['imageKeys'][0]
            elif item.get('imageKey'):
                image_key = item['imageKey']
            
            # Skip if already has tags
            if auto_tags:
                skipped_has_tags += 1
                continue
            
            # Skip if no image
            if not image_key:
                skipped_no_image += 1
                continue
            
            try:
                # Create S3 event message
                s3_event = {
                    "Records": [{
                        "eventVersion": "2.1",
                        "eventSource": "aws:s3",
                        "awsRegion": REGION,
                        "eventName": "ObjectCreated:Put",
                        "s3": {
                            "bucket": {
                                "name": BUCKET_NAME
                            },
                            "object": {
                                "key": image_key
                            }
                        }
                    }]
                }
                
                # Send to DetectLabelsQueue
                sqs.send_message(
                    QueueUrl=DETECT_LABELS_QUEUE,
                    MessageBody=json.dumps(s3_event),
                    MessageAttributes={
                        'source': {
                            'StringValue': 'reprocess_script',
                            'DataType': 'String'
                        },
                        'articleId': {
                            'StringValue': article_id,
                            'DataType': 'String'
                        }
                    }
                )
                
                print(f"  ✅ Queued {article_id}: {image_key}")
                reprocessed += 1
                
            except Exception as e:
                print(f"  ❌ Error queueing {article_id}: {e}")
                error_count += 1
        
        # Check for more items
        if 'LastEvaluatedKey' not in response:
            break
        scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
    
    # Summary
    print("\n" + "="*60)
    print("REPROCESS SUMMARY")
    print("="*60)
    print(f"✅ Queued for reprocessing: {reprocessed} articles")
    print(f"⏭️  Skipped (has tags):      {skipped_has_tags} articles")
    print(f"⏭️  Skipped (no image):      {skipped_no_image} articles")
    print(f"❌ Errors:                  {error_count} articles")
    print(f"📊 Total scanned:           {reprocessed + skipped_has_tags + skipped_no_image}")
    print("="*60)
    print(f"\n⏳ Processing will take ~30-60 seconds per article")
    print(f"⏳ Total estimated time: ~{reprocessed * 45 // 60} minutes")
    print(f"\n💡 Check CloudWatch Logs: /aws/lambda/travel-guided-DetectLabelsFunction-*")
    print(f"💡 Check Gallery after processing: /gallery")
    
    return reprocessed, error_count


if __name__ == '__main__':
    print("="*60)
    print("REPROCESS OLD ARTICLES")
    print("="*60)
    print(f"Articles Table: {ARTICLES_TABLE}")
    print(f"Queue: {DETECT_LABELS_QUEUE}")
    print(f"Bucket: {BUCKET_NAME}")
    print(f"Region: {REGION}")
    print("="*60)
    print("\n⚠️  This will:")
    print("  - Find all articles with images but no autoTags")
    print("  - Send S3 events to DetectLabelsQueue")
    print("  - Trigger Rekognition to analyze images")
    print("  - Generate tags and save to Gallery tables")
    print("  - Process time: ~30-60 seconds per article")
    
    confirm = input("\nContinue? (yes/no): ")
    
    if confirm.lower() != 'yes':
        print("❌ Reprocessing cancelled.")
        exit(0)
    
    print("\n🚀 Starting reprocessing...\n")
    
    try:
        reprocessed, errors = reprocess_articles()
        
        if errors > 0:
            print(f"\n⚠️  Reprocessing completed with {errors} errors.")
            exit(1)
        else:
            print("\n✅ Reprocessing queued successfully!")
            print(f"\n🎉 {reprocessed} articles will be processed in the background!")
            exit(0)
            
    except Exception as e:
        print(f"\n❌ Reprocessing failed: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
