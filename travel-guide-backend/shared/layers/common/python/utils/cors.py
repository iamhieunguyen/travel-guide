import json
import os

def ok(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': os.environ.get('CORS_ORIGIN', '*'),
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-User-Id',
            'Access-Control-Allow-Methods': 'POST,OPTIONS,GET,DELETE,PUT,PATCH'
        },
        'body': json.dumps(body, ensure_ascii=False)
    }

def error(status_code, message):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': os.environ.get('CORS_ORIGIN', '*'),
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-User-Id',
            'Access-Control-Allow-Methods': 'POST,OPTIONS,GET,DELETE,PUT,PATCH'
        },
        'body': json.dumps({'error': message}, ensure_ascii=False)
    }

def options():
    return {
        'statusCode': 204,
        'headers': {
            'Access-Control-Allow-Origin': os.environ.get('CORS_ORIGIN', '*'),
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-User-Id',
            'Access-Control-Allow-Methods': 'POST,OPTIONS,GET,DELETE,PUT,PATCH',
            'Access-Control-Max-Age': '86400'
        },
        'body': ''
    }