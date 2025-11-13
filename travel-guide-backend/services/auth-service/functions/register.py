import boto3
import json
import os

client = boto3.client('cognito-idp')

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])
        username = body['username']
        email = body['email']
        password = body['password']

        response = client.sign_up(
            ClientId=os.environ['CLIENT_ID'],
            Username=username,
            Password=password,
            UserAttributes=[
                {'Name': 'email', 'Value': email}
            ]
        )

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'message': 'Registration successful. Please check your email for confirmation code.',
                'user_sub': response['UserSub']
            })
        }
    except client.exceptions.UsernameExistsException:
        return error_response(400, 'Username already exists')
    except Exception as e:
        print(f"Registration error: {e}")
        return error_response(500, f'Registration failed: {str(e)}')

def error_response(status, message):
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        'body': json.dumps({'error': message})
    }