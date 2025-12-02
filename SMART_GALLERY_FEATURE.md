# Smart Gallery with AI Trending Tags

## Overview
Feature hiển thị các tags trending được tạo tự động bởi AWS Rekognition AI từ tất cả bài viết public.

## Architecture

### Backend
- **API Endpoint**: `GET /gallery/trending?limit=20`
- **Lambda Function**: `GetTrendingTagsFunction`
- **Logic**:
  1. Scan tất cả bài viết public trong ArticlesTable
  2. Aggregate `autoTags` từ Rekognition
  3. Count số lượng mỗi tag
  4. Lấy cover image mới nhất cho mỗi tag
  5. Sort theo count giảm dần
  6. Return top N tags

### Frontend
- **Route**: `/gallery`
- **Components**:
  - `SmartGalleryPage.jsx` - Main page
  - `TrendingTagCard.jsx` - Card component với hover effects
  - `galleryApi.js` - API service

## Features

### 1. Trending Tags Display
- Responsive grid layout (2/4/5 columns)
- Card với background image từ bài viết mới nhất
- Tag name và count
- Hover effects: zoom, brightness, smooth transitions

### 2. Click to Search
- Click vào tag → navigate to HomePage với search query
- Filter bài viết theo tag đó

### 3. Loading & Error States
- Skeleton loading
- Error handling với retry button
- Empty state

## Cost Optimization

**Không tạo table mới!** Sử dụng lại:
- ✅ ArticlesTable hiện có
- ✅ autoTags từ Rekognition (đã có sẵn)
- ✅ Không cần DynamoDB Streams
- ✅ Không cần aggregation table

**Trade-off**:
- Scan toàn bộ table mỗi request (có thể chậm với nhiều data)
- Có thể optimize sau bằng caching (ElastiCache/CloudFront)

## Usage

### Access
1. Vào HomePage
2. Click "Trending Tags" trong sidebar
3. Hoặc truy cập trực tiếp: `https://your-domain.com/gallery`

### API
```bash
curl https://seu0qchftd.execute-api.ap-southeast-1.amazonaws.com/Prod/gallery/trending?limit=20
```

Response:
```json
{
  "items": [
    {
      "tag_name": "Beach",
      "count": 15,
      "cover_image": "articles/abc123.jpg",
      "last_updated": "2025-12-03T05:00:00Z"
    }
  ],
  "total_tags": 45
}
```

## Future Enhancements

### Performance
1. **Add Caching**:
   - CloudFront cache for API response (TTL: 5 minutes)
   - ElastiCache Redis for aggregated data
   
2. **Pagination**:
   - Load more tags on scroll
   - Reduce initial scan size

3. **DynamoDB Optimization**:
   - Create GSI for faster tag queries
   - Use DynamoDB Streams to maintain aggregation table

### Features
1. **Tag Details Page**:
   - Click tag → show all articles with that tag
   - Filter by date, location

2. **Trending Algorithm**:
   - Weight by recency (newer posts = higher score)
   - Weight by engagement (likes, views)

3. **User Preferences**:
   - Save favorite tags
   - Personalized recommendations

## Files Changed

### Backend
- `travel-guide-backend/functions/articles/get_trending_tags.py` - New
- `travel-guide-backend/template.yaml` - Added GetTrendingTagsFunction

### Frontend
- `travel-guide-frontend/src/pages/SmartGalleryPage.jsx` - New
- `travel-guide-frontend/src/components/gallery/TrendingTagCard.jsx` - New
- `travel-guide-frontend/src/services/galleryApi.js` - New
- `travel-guide-frontend/src/App.js` - Added /gallery route
- `travel-guide-frontend/src/pages/HomePage.jsx` - Added sidebar link

## Testing

1. **Backend**:
```bash
# Test API
curl https://seu0qchftd.execute-api.ap-southeast-1.amazonaws.com/Prod/gallery/trending

# Check CloudWatch Logs
aws logs tail /aws/lambda/travel-guided-GetTrendingTagsFunction --follow
```

2. **Frontend**:
- Navigate to `/gallery`
- Check loading state
- Click on tags
- Test responsive layout

## Deployment

```bash
# Backend
cd travel-guide-backend
sam build
sam deploy

# Frontend
cd travel-guide-frontend
npm run build
aws s3 sync build/ s3://travel-guided-staticsitebucket-8vfkgzlgt9xp --delete
aws cloudfront create-invalidation --distribution-id EVEUI04QADJT3 --paths "/*"
```

## Notes

- Tags được tạo tự động bởi Rekognition khi upload ảnh
- Chỉ hiển thị tags từ bài viết public
- Scan có thể chậm với >1000 bài viết → cần optimize sau
- Cover image là ảnh mới nhất có tag đó
