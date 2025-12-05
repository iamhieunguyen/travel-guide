# Requirements Document

## Introduction

Hệ thống hiện tại cho phép người dùng tạo bài viết và bài viết được hiển thị công khai ngay lập tức. Điều này tạo ra rủi ro về nội dung không phù hợp xuất hiện trước khi AI moderation xử lý xong. Tính năng này sẽ thêm cơ chế pending status để bài viết chỉ hiển thị cho chủ nhân trong lúc AI xử lý, và chỉ public sau khi được duyệt.

## Glossary

- **ArticlesTable**: Bảng DynamoDB lưu trữ tất cả bài viết
- **Status**: Trạng thái của bài viết (pending, approved, rejected)
- **Pending**: Trạng thái bài viết đang chờ AI moderation xử lý
- **Approved**: Trạng thái bài viết đã được AI duyệt và có thể hiển thị công khai
- **Rejected**: Trạng thái bài viết bị từ chối do vi phạm nội dung
- **Owner**: Người tạo bài viết (ownerId)
- **Public Feed**: Danh sách bài viết hiển thị cho tất cả người dùng
- **Personal Feed**: Danh sách bài viết của chính người dùng
- **Content Moderation**: Quá trình AI kiểm tra nội dung ảnh
- **GSI**: Global Secondary Index trong DynamoDB

## Requirements

### Requirement 1: Article Status Management

**User Story:** As a system administrator, I want articles to have status tracking, so that inappropriate content doesn't appear publicly before moderation completes.

#### Acceptance Criteria

1. WHEN a user creates a new article, THE system SHALL set the article status to "pending"
2. WHEN content moderation completes successfully, THE system SHALL update the article status to "approved"
3. WHEN content moderation detects violations, THE system SHALL update the article status to "rejected"
4. THE system SHALL store the status field in ArticlesTable for all articles
5. THE system SHALL maintain backward compatibility with existing articles that have no status field

### Requirement 2: Public Feed Filtering

**User Story:** As a public user, I want to see only approved articles in the public feed, so that I don't see inappropriate or unmoderated content.

#### Acceptance Criteria

1. WHEN querying the public feed, THE system SHALL return only articles with status "approved"
2. WHEN an article has status "pending", THE system SHALL exclude it from public feed results
3. WHEN an article has status "rejected", THE system SHALL exclude it from public feed results
4. WHEN an article has no status field (legacy data), THE system SHALL treat it as "approved" for backward compatibility
5. THE system SHALL use efficient database queries with GSI to filter by status

### Requirement 3: Owner Visibility

**User Story:** As an article owner, I want to see my pending articles in my personal feed, so that I know my posts are being processed.

#### Acceptance Criteria

1. WHEN querying personal feed (scope=mine), THE system SHALL return articles with all statuses for the owner
2. WHEN displaying a pending article to the owner, THE system SHALL show a visual indicator that the article is being processed
3. WHEN displaying a rejected article to the owner, THE system SHALL show the rejection reason
4. THE system SHALL allow owners to view their pending articles immediately after creation
5. THE system SHALL not allow owners to edit or delete articles while status is "pending"

### Requirement 4: Search and Gallery Filtering

**User Story:** As a user searching for content, I want search results to only include approved articles, so that search quality remains high.

#### Acceptance Criteria

1. WHEN searching articles by text query, THE system SHALL return only articles with status "approved"
2. WHEN searching articles by tags, THE system SHALL return only articles with status "approved"
3. WHEN querying gallery photos by tag, THE system SHALL return only photos from approved articles
4. WHEN querying trending tags, THE system SHALL count only photos from approved articles
5. THE system SHALL exclude pending and rejected articles from all public-facing search and discovery features

### Requirement 5: Database Schema Updates

**User Story:** As a system architect, I want efficient database queries for status filtering, so that the system performs well at scale.

#### Acceptance Criteria

1. THE system SHALL add a "status" attribute to ArticlesTable schema
2. THE system SHALL create a Global Secondary Index (GSI) with partition key "status" and sort key "createdAt"
3. THE system SHALL use the GSI for efficient queries of approved articles sorted by creation time
4. THE system SHALL maintain existing GSI (gsi_visibility_createdAt, gsi_owner_createdAt) for backward compatibility
5. THE system SHALL handle GSI creation without downtime or data loss

### Requirement 6: Migration and Backward Compatibility

**User Story:** As a system administrator, I want existing articles to work correctly after the status feature is deployed, so that no data is lost or broken.

#### Acceptance Criteria

1. WHEN querying articles without a status field, THE system SHALL treat them as "approved"
2. WHEN displaying legacy articles, THE system SHALL not show status indicators
3. THE system SHALL provide a migration script to add status="approved" to all existing articles
4. THE system SHALL allow gradual migration without requiring immediate update of all records
5. THE system SHALL log any articles that fail status validation for manual review

### Requirement 7: User Notifications

**User Story:** As an article owner, I want to be notified when my article is approved or rejected, so that I understand the moderation outcome.

#### Acceptance Criteria

1. WHEN an article status changes from "pending" to "approved", THE system SHALL update the article record with moderatedAt timestamp
2. WHEN an article status changes to "rejected", THE system SHALL store the rejection reason in moderationDetails
3. THE system SHALL provide clear feedback in the UI about article status
4. WHEN viewing a pending article, THE system SHALL display "Đang xử lý..." message
5. WHEN viewing a rejected article, THE system SHALL display rejection reason to the owner

### Requirement 8: Performance and Scalability

**User Story:** As a system architect, I want status filtering to be performant, so that the system can handle high traffic.

#### Acceptance Criteria

1. WHEN querying approved articles, THE system SHALL use GSI query (not scan) for O(log n) performance
2. WHEN filtering by status, THE system SHALL complete queries in under 100ms for 95th percentile
3. THE system SHALL support at least 1000 requests per second for public feed queries
4. THE system SHALL batch update status changes to minimize DynamoDB write costs
5. THE system SHALL use conditional updates to prevent race conditions during status changes
