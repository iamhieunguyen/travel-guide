# Travel Guide - Full Stack Application

A comprehensive travel guide platform built with React frontend and AWS serverless backend, featuring AI-powered image tagging, location services, and real-time content management.

## 🌟 Features

### Core Functionality
- **Article Management**: Create, read, update, delete travel articles with rich content
- **Multi-Image Support**: Upload up to 4 images per article with automatic thumbnail generation
- **Location Services**: GPS-based article creation with reverse geocoding
- **User Authentication**: Secure login/register with AWS Cognito
- **Favorites System**: Save and manage favorite articles
- **Search & Discovery**: Full-text search with location and tag filtering

### AI-Powered Features
- **Auto-Tagging**: AWS Rekognition automatically tags images with travel-relevant labels
- **Content Moderation**: Automatic inappropriate content detection
- **Smart Prioritization**: Custom label scoring system for travel-specific content
- **Gallery Discovery**: Trending tags and photo-based article discovery

### Technical Features
- **Serverless Architecture**: AWS Lambda, DynamoDB, S3, SQS
- **Real-time Processing**: Event-driven image processing pipeline
- **CDN Integration**: CloudFront for optimized image delivery
- **Caching Strategy**: Multi-layer caching for performance

## 🏗️ Architecture

### Frontend (React)
```
travel-guide-frontend/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Route components
│   ├── services/           # API integration
│   ├── context/            # React Context providers
│   ├── hooks/              # Custom React hooks
│   └── utils/              # Helper functions
```

### Backend (AWS SAM)
```
travel-guide-backend/
├── functions/
│   ├── auth/               # Authentication functions
│   ├── articles/           # Article CRUD operations
│   ├── image_processing/   # Image validation & thumbnails
│   ├── rekognition/        # AI tagging & moderation
│   ├── notifications/      # Email notifications
│   └── utils/              # Shared utilities
├── layers/                 # Lambda layers
└── scripts/                # Deployment scripts
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- AWS CLI configured
- AWS SAM CLI
- Docker (for local development)

### Environment Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd travel-guide
```

2. **Backend Setup**
```bash
cd travel-guide-backend

# Install SAM CLI if not installed
pip install aws-sam-cli

# Build the application
sam build

# Deploy to AWS (first time)
sam deploy --guided

# For subsequent deployments
sam deploy
```

3. **Frontend Setup**
```bash
cd travel-guide-frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Update environment variables
# REACT_APP_API_GATEWAY_URL=<your-api-gateway-url>
# REACT_APP_COGNITO_USER_POOL_ID=<your-user-pool-id>
# REACT_APP_COGNITO_CLIENT_ID=<your-client-id>
# REACT_APP_CF_DOMAIN=<your-cloudfront-domain>

# Start development server
npm start
```

### Local Development

**Backend (Local API)**
```bash
cd travel-guide-backend
sam local start-api --port 3001
```

**Frontend (Development Server)**
```bash
cd travel-guide-frontend
npm start
```

## 📋 API Documentation

### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/confirm` - Email confirmation
- `POST /auth/change-password` - Password change

### Article Endpoints
- `GET /articles` - List articles (public/private)
- `POST /articles` - Create new article
- `GET /articles/{id}` - Get article by ID
- `PATCH /articles/{id}` - Update article
- `DELETE /articles/{id}` - Delete article
- `GET /search` - Search articles

### Upload & Media
- `POST /upload-url` - Get presigned S3 upload URL
- `GET /gallery/trending` - Get trending tags
- `GET /gallery/articles` - Get articles by tag

### User Profile
- `GET /profile` - Get user profile
- `PATCH /profile` - Update profile
- `POST /profile/avatar-upload-url` - Avatar upload URL

### Favorites
- `POST /articles/{id}/favorite` - Add to favorites
- `DELETE /articles/{id}/favorite` - Remove from favorites
- `GET /me/favorites` - List user favorites

## 🔧 Configuration

### AWS Resources
The application creates the following AWS resources:

**Storage & CDN**
- S3 Buckets (images, static site)
- CloudFront Distribution
- DynamoDB Tables (articles, users, favorites, gallery)

**Compute**
- Lambda Functions (~25 functions)
- Lambda Layers (shared dependencies)
- API Gateway (REST API)

**AI & Processing**
- AWS Rekognition (image analysis)
- SQS Queues (async processing)
- SNS Topics (notifications)

**Security**
- Cognito User Pool (authentication)
- IAM Roles & Policies
- S3 Bucket Policies

### Environment Variables

**Backend Lambda Functions**
```yaml
TABLE_NAME: DynamoDB table name
BUCKET_NAME: S3 bucket for images
USER_POOL_ID: Cognito User Pool ID
CLIENT_ID: Cognito Client ID
GALLERY_PHOTOS_TABLE: Gallery photos table
GALLERY_TRENDS_TABLE: Trending tags table
```

**Frontend React App**
```env
REACT_APP_API_GATEWAY_URL=https://api.example.com/Prod
REACT_APP_COGNITO_USER_POOL_ID=ap-southeast-1_xxxxxxxxx
REACT_APP_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
REACT_APP_CF_DOMAIN=https://d1234567890.cloudfront.net
```

## 🔄 Image Processing Pipeline

The application features a sophisticated image processing pipeline:

1. **Upload**: User uploads image via presigned S3 URL
2. **Validation**: Lambda validates image format, size, dimensions
3. **AI Analysis**: Rekognition detects labels and moderates content
4. **Tagging**: Custom scoring system prioritizes travel-relevant tags
5. **Thumbnails**: Generate multiple thumbnail sizes (256px, 512px, 1024px)
6. **Gallery**: Save metadata to gallery tables for discovery
7. **Notification**: Email notification when processing complete

## 🏷️ Auto-Tagging System

### Label Prioritization
The AI tagging system uses a custom scoring algorithm:

**High Priority Tags** (+150 points)
- temple, pagoda, beach, mountain, waterfall, monument, landmark

**Medium Priority Tags** (+100 points)
- lake, ocean, forest, sunset, architecture, palace, ruins

**Low Priority Tags** (+50 points)
- city, park, garden, animal, boat, food, restaurant

**Penalties** (-30 points)
- Generic labels: outdoor, nature, indoors, daylight

### Configuration
Tag priorities can be customized via S3 config file:
```json
{
  "label_priorities": {
    "critical": {
      "score_boost": 150,
      "keywords": ["temple", "beach", "mountain"]
    }
  },
  "excluded_labels": {
    "keywords": ["mammal", "vertebrate", "adult"]
  }
}
```

## 🚀 Deployment

### Production Deployment
```bash
# Backend
cd travel-guide-backend
sam build --use-container
sam deploy --parameter-overrides Environment=prod

# Frontend
cd travel-guide-frontend
npm run build
aws s3 sync build/ s3://your-static-site-bucket/
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### Staging Environment
```bash
# Use different parameter files
sam deploy --parameter-overrides Environment=staging --config-file samconfig-staging.toml
```

## 📊 Monitoring & Logging

### CloudWatch Metrics
- Lambda function duration and errors
- DynamoDB read/write capacity
- S3 request metrics
- API Gateway latency

### Alarms
- DLQ message count (image processing failures)
- Lambda error rates
- DynamoDB throttling

### Logs
- Structured logging in all Lambda functions
- Request/response logging in API Gateway
- CloudFront access logs

## 🔒 Security

### Authentication
- JWT tokens via AWS Cognito
- Token refresh mechanism
- Password policies (8+ chars, mixed case, numbers)

### Authorization
- Resource-based access control
- Owner-only article modification
- Private/public article visibility

### Data Protection
- S3 bucket encryption
- DynamoDB encryption at rest
- HTTPS-only communication
- CORS configuration

## 🧪 Testing

### Frontend Testing
```bash
cd travel-guide-frontend
npm test                    # Unit tests
npm run test:coverage      # Coverage report
npm run test:e2e          # End-to-end tests
```

### Backend Testing
```bash
cd travel-guide-backend
python -m pytest tests/   # Unit tests
sam local invoke          # Local function testing
```

## 📈 Performance Optimization

### Frontend
- Code splitting with React.lazy()
- Image lazy loading
- Request caching (5-minute TTL)
- CloudFront CDN integration

### Backend
- DynamoDB single-table design
- Lambda layer for shared dependencies
- S3 Transfer Acceleration
- Thumbnail pre-generation

### Caching Strategy
- **Browser Cache**: Static assets (1 year)
- **CloudFront Cache**: Images (1 year), API responses (5 minutes)
- **Application Cache**: Article lists (5 minutes)
- **DynamoDB**: On-demand billing for cost optimization

## 🐛 Troubleshooting

### Common Issues

**Image Upload Fails**
- Check S3 bucket CORS configuration
- Verify presigned URL expiration
- Check file size limits (10MB max)

**Auto-tags Not Appearing**
- Verify S3 event notifications to SQS
- Check Rekognition service limits
- Review image format support (JPG, PNG only)

**Authentication Issues**
- Verify Cognito User Pool configuration
- Check JWT token expiration
- Confirm API Gateway authorizer setup

### Debug Commands
```bash
# Check Lambda logs
aws logs tail /aws/lambda/function-name --follow

# Test API endpoints
curl -H "Authorization: Bearer $TOKEN" https://api.example.com/articles

# Validate SAM template
sam validate --template template.yaml
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow ESLint configuration for frontend
- Use Python Black for backend formatting
- Write unit tests for new features
- Update documentation for API changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- AWS Serverless Application Model (SAM)
- React.js community
- AWS Rekognition for AI capabilities
- OpenStreetMap for location services

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review AWS CloudWatch logs for errors

---

**Built with ❤️ using AWS Serverless Technologies**
