import boto3
import os

TABLE_NAME = os.environ.get('TABLE_NAME', 'travel-guided-ArticlesTable-L3G1OXLHH7H')
REGION = 'ap-southeast-1'

dynamodb = boto3.resource('dynamodb', region_name=REGION)
table = dynamodb.Table(TABLE_NAME)

# Update test article
table.update_item(
    Key={'articleId': 'a1875670-c9fd-4b1c-9c38-d583887aef4e'},
    UpdateExpression='SET locationName = :loc',
    ExpressionAttributeValues={
        ':loc': 'Batu Caves, Gombak, Selangor, Malaysia'
    }
)

print("✅ Updated test article with locationName")
