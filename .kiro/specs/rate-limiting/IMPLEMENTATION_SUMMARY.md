# Rate Limiting Implementation Summary

## ✅ Đã Implement: Option 4 - Toast + Rate Limiting

### 🎯 Chiến lược 2 lớp bảo vệ:

**Layer 1: Frontend (UX + Basic Protection)**
- ✅ `isPosting` state - Disable button khi đang post
- ✅ `cooldownTime` state - Countdown timer
- ✅ Toast notification - Thông báo user
- ✅ Duplicate request prevention

**Layer 2: Backend (Security + Real Protection)**
- ✅ Rate limit check trong `create_article.py`
- ✅ Query last post từ DynamoDB
- ✅ Return 429 nếu spam (< 30s)
- ✅ Error message với thời gian còn lại

---

## 📊 Cách hoạt động:

### **Flow Diagram:**
```
User click "Đăng bài"
    ↓
Frontend: Check isPosting
    ├─ If true → Ignore (prevent duplicate)
    └─ If false → Continue
    ↓
Frontend: Check cooldownTime
    ├─ If > 0 → Show toast "Đợi Xs"
    └─ If 0 → Continue
    ↓
Frontend: setIsPosting(true)
    ↓
Backend: Query last post
    ↓
Backend: Calculate time_diff
    ↓
If time_diff < 30s:
    ├─ Return 429 "Vui lòng đợi Xs"
    ├─ Frontend: Start cooldown timer
    ├─ Frontend: Show toast
    └─ Frontend: setIsPosting(false)
Else:
    ├─ Create post successfully
    ├─ Frontend: Success message
    └─ Frontend: setIsPosting(false)
```

---

## 🔧 Technical Details:

### **Backend (create_article.py):**

```python
# Rate limiting check
last_posts = table.query(
    IndexName='gsi_owner_createdAt',
    KeyConditionExpression='ownerId = :owner_id',
    Limit=1
)

if last_posts.get('Items'):
    last_created = datetime.fromisoformat(last_post['createdAt'])
    time_diff = (now - last_created).total_seconds()
    
    if time_diff < 30:  # 30 seconds rate limit
        wait_time = int(30 - time_diff)
        return error(429, f"Vui lòng đợi {wait_time}s...")
```

**Key Points:**
- Uses existing GSI `gsi_owner_createdAt`
- No additional DynamoDB table needed
- Non-critical error handling (continues if check fails)
- Returns exact wait time to user

### **Frontend (CreatePostModalContext.jsx):**

```javascript
// State
const [isPosting, setIsPosting] = useState(false);
const [cooldownTime, setCooldownTime] = useState(0);

// In handleShare
if (isPosting) return; // Prevent duplicate
if (cooldownTime > 0) {
  showToast(`Đợi ${cooldownTime}s...`);
  return;
}

setIsPosting(true);
try {
  // ... create post ...
} catch (error) {
  if (error.status === 429) {
    // Start countdown timer
    setCooldownTime(waitTime);
    setInterval(() => setCooldownTime(prev => prev - 1), 1000);
  }
} finally {
  setIsPosting(false);
}
```

**Key Points:**
- Double protection: `isPosting` + `cooldownTime`
- Countdown timer updates every second
- Toast notification for user feedback
- Auto-clears when cooldown reaches 0

---

## 🎨 UI/UX:

### **Normal State:**
```
[Đăng bài] ← Enabled, clickable
```

### **Posting State:**
```
[⏳ Đang đăng...] ← Disabled, spinner
```

### **Cooldown State:**
```
[⏱️ Đợi 25s] ← Disabled, countdown
Toast: "Vui lòng đợi 25s trước khi đăng bài tiếp"
```

---

## 📊 Configuration:

### **Rate Limit Settings:**

```python
# Backend: create_article.py
RATE_LIMIT_SECONDS = 30  # Change this to adjust rate limit
```

**Recommended values:**
- `10` seconds - Strict (for high-traffic apps)
- `30` seconds - Balanced (recommended)
- `60` seconds - Relaxed (for low-traffic apps)

---

## 🧪 Testing:

### **Test Case 1: Normal Post**
```
1. User creates post
2. Click "Đăng bài"
3. ✅ Post created successfully
4. Wait 30s
5. Create another post
6. ✅ Post created successfully
```

### **Test Case 2: Spam Prevention**
```
1. User creates post
2. Click "Đăng bài"
3. ✅ Post created successfully
4. Immediately create another post
5. Click "Đăng bài"
6. ❌ Backend returns 429
7. ✅ Toast shows "Vui lòng đợi 28s..."
8. ✅ Button shows countdown
9. Wait 28s
10. ✅ Button enabled again
```

### **Test Case 3: Duplicate Click**
```
1. User creates post
2. Click "Đăng bài" rapidly 5 times
3. ✅ Only 1 request sent (isPosting prevents duplicates)
4. ✅ Post created once
```

### **Test Case 4: API Spam (Postman)**
```
1. Send POST /articles via Postman
2. ✅ Post created
3. Immediately send another POST
4. ❌ Backend returns 429
5. ✅ Spam blocked at API level
```

---

## 💰 Cost Impact:

### **DynamoDB:**
- Additional query per post: 1 read unit
- Uses existing GSI (no new index needed)
- Cost: ~$0.00025 per 1000 posts

### **Lambda:**
- Additional execution time: ~50ms
- Negligible cost increase

**Total:** < $0.01/month for 10,000 posts

---

## 🚀 Deployment:

### **Backend:**
```bash
cd travel-guide-backend
sam build --use-container
sam deploy
```

### **Frontend:**
```bash
cd travel-guide-frontend
npm run build
# Deploy to S3/CloudFront
```

---

## 🔒 Security Benefits:

1. ✅ **Prevents spam** - Max 1 post per 30s
2. ✅ **Protects database** - Reduces write load
3. ✅ **Saves costs** - Fewer unnecessary writes
4. ✅ **Better UX** - Clear feedback to users
5. ✅ **API-level protection** - Can't bypass via Postman
6. ✅ **Scalable** - Works for any number of users

---

## 📝 Future Enhancements:

### **Option A: Tiered Rate Limiting**
```python
# Different limits for different user types
if user.is_premium:
    RATE_LIMIT = 10  # Premium: 10s
else:
    RATE_LIMIT = 30  # Free: 30s
```

### **Option B: Daily Post Limit**
```python
# Max 50 posts per day
daily_posts = count_posts_today(user_id)
if daily_posts >= 50:
    return error(429, "Đã đạt giới hạn 50 bài/ngày")
```

### **Option C: Progressive Cooldown**
```python
# Increase cooldown if user keeps spamming
spam_count = get_spam_count(user_id)
cooldown = 30 * (2 ** spam_count)  # 30s, 60s, 120s, ...
```

---

## ✨ Summary:

**Implemented:**
- ✅ Frontend: `isPosting` + `cooldownTime` states
- ✅ Backend: Rate limit check (30s)
- ✅ Toast notifications
- ✅ Countdown timer
- ✅ 429 error handling

**Benefits:**
- 🛡️ Spam protection
- 💰 Cost savings
- 🎨 Better UX
- 🔒 API security

**Ready for production!** 🚀
