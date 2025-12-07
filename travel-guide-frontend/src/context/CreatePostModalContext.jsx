// context/CreatePostModalContext.jsx
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "./AuthContext";
import api, { createArticleWithMultipleUploads } from "../services/article";

const CreatePostModalContext = createContext();

export function CreatePostModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [image, setImage] = useState(null);
  const [aspect, setAspect] = useState("1:1");
  const [editMode, setEditMode] = useState(false);
  const [editPostData, setEditPostData] = useState(null);
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [isPosting, setIsPosting] = useState(false);
  
  // Quản lý Cooldown
  const [cooldownTime, setCooldownTime] = useState(0);
  const intervalRef = useRef(null); // Sử dụng useRef để quản lý interval

  const { getIdToken, refreshAuth, user } = useAuth();

  // Hàm xử lý việc khởi động Cooldown Timer - Tinh tế và cô đọng hơn
  const startCooldownTimer = useCallback((waitTime) => {
    // 1. Dừng timer cũ nếu có
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // 2. Lưu thời gian kết thúc vào localStorage để tránh bypass bằng refresh
    const endTime = Date.now() + (waitTime * 1000);
    localStorage.setItem('postCooldown', JSON.stringify({ endTime }));
    
    // 3. Thiết lập thời gian chờ
    setCooldownTime(waitTime);
    
    // 4. Bắt đầu đếm ngược mượt mà
    intervalRef.current = setInterval(() => {
      setCooldownTime(prev => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          // Xóa cooldown khỏi localStorage khi hết thời gian
          localStorage.removeItem('postCooldown');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // 5. Hiển thị thông báo (nếu có sẵn)
    if (window.showSuccessToast) {
      const message = `⏱️ Vui lòng đợi ${waitTime}s trước khi đăng bài tiếp`;
      window.showSuccessToast(message);
    }
    
    console.log(`⏱️ Rate Limit: Bắt đầu đếm ngược ${waitTime}s`);
  }, []);

  // Load cooldown from localStorage on mount
  useEffect(() => {
    const savedCooldown = localStorage.getItem('postCooldown');
    if (savedCooldown) {
      const { endTime } = JSON.parse(savedCooldown);
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      
      if (remaining > 0) {
        console.log(`⏱️ Khôi phục cooldown: ${remaining}s còn lại`);
        startCooldownTimer(remaining);
      } else {
        // Cooldown đã hết, xóa khỏi localStorage
        localStorage.removeItem('postCooldown');
      }
    }
  }, [startCooldownTimer]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);


  const openModal = useCallback(() => {
    if (!getIdToken()) {
      alert("Vui lòng đăng nhập để tạo bài đăng");
      return;
    }
    setIsOpen(true);
    setStep(1);
    setImage(null);
    setAspect("1:1");
    setEditMode(false);
    setEditPostData(null);
    setCaption("");
    setPrivacy(user?.defaultPrivacyPref || "public");
  }, [getIdToken, user]);

  const openEditModal = useCallback((post) => {
    if (!getIdToken()) {
      alert('Vui lòng đăng nhập để chỉnh sửa bài đăng');
      return;
    }
    setIsOpen(true);
    setStep(2); // Skip to PostDetails step
    setEditMode(true);
    setEditPostData(post);
    // Set images from post - support both single and multiple images
    if (post.imageKeys && post.imageKeys.length > 0) {
      // Multiple images
      const imageUrls = post.imageKeys.map(key => 
        key.startsWith('http') ? key : `https://${process.env.REACT_APP_CF_DOMAIN}/${key}`
      );
      setImage(imageUrls);
    } else if (post.imageKey) {
      // Single image (backward compatibility)
      const imageUrl = post.imageKey.startsWith('http') 
        ? post.imageKey 
        : `https://${process.env.REACT_APP_CF_DOMAIN}/${post.imageKey}`;
      setImage([imageUrl]); // Wrap in array for consistency
    }
  }, [getIdToken]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setEditMode(false);
    setEditPostData(null);
    setCaption("");
    setPrivacy(user?.defaultPrivacyPref || "public");
  }, [user]);

  // Data URL -> File (có guard)
  const dataURLToFile = useCallback((dataurl, filename) => {
    if (typeof dataurl !== "string" || !dataurl.startsWith("data:")) {
      throw new Error("Ảnh không phải data URL hợp lệ");
    }
    const arr = dataurl.split(",");
    if (arr.length < 2) throw new Error("Data URL không hợp lệ");
    const m = arr[0].match(/^data:(.*?);base64$/i);
    const mime = m ? m[1] : "application/octet-stream";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  }, []);

  const handleShare = useCallback(async (postData) => {
    // Check if already posting
    if (isPosting) {
      console.log('⚠️ Already posting, ignoring duplicate request');
      return;
    }
    
    // Check cooldown
    if (cooldownTime > 0) {
      // Sử dụng thông báo trực tiếp từ state để tăng tính đồng bộ
      const remainingTime = Math.max(1, cooldownTime);
      if (window.showSuccessToast) {
        window.showSuccessToast(`Vui lòng đợi ${remainingTime}s trước khi đăng bài tiếp`);
      }
      return;
    }
    
    setIsPosting(true);
    
    try {
      console.log('📤 handleShare - Starting...', postData);
      console.log('🔧 Edit mode:', editMode);
      console.log('📝 Edit post data:', editPostData);
      
      if (!getIdToken()) {
        console.log('⚠️ No token, trying to refresh...');
        // Thử refresh auth
        const refreshed = await refreshAuth();
        if (!refreshed) {
          throw new Error('Vui lòng đăng nhập lại');
        }
      }

      console.log('✅ Token OK');
      
      // Nếu đang ở chế độ edit
      if (editMode && editPostData) {
        console.log('✏️ Updating existing article:', editPostData.articleId);
        
        const updateData = {
          title: postData.caption,
          content: postData.caption,
          visibility: postData.privacy || 'public',
          lat: postData.location.lat,
          lng: postData.location.lng,
          locationName: postData.location.name || `${postData.location.lat}, ${postData.location.lng}`,
        };
        
        // If images are provided (reordered), extract the keys and send them
        if (postData.image && Array.isArray(postData.image) && postData.image.length > 0) {
          // Extract image keys from URLs (remove CloudFront domain)
          const imageKeys = postData.image.map(url => {
            if (url.includes(process.env.REACT_APP_CF_DOMAIN)) {
              // Extract key from CloudFront URL
              return url.split(`${process.env.REACT_APP_CF_DOMAIN}/`)[1];
            }
            return url; // If already a key, use as is
          });
          updateData.imageKeys = imageKeys;
          console.log('📸 Updating image order:', imageKeys);
        }
        
        const result = await api.updateArticle(editPostData.articleId, updateData);
        console.log('✅ Update success:', result);
        
        // ✅ Invalidate cache để user thấy bài đã update ngay
        console.log('🗑️ Invalidating cache after update...');
        api.invalidateArticlesCache();
        
        return result;
      }
      
      // Nếu đang tạo mới
      console.log('🖼️ Image type:', typeof postData.image);
      console.log('🖼️ Image value:', Array.isArray(postData.image) ? `Array of ${postData.image.length} images` : postData.image);
      
      // Xử lý mảng ảnh
      const imagesToUpload = Array.isArray(postData.image) ? postData.image : [postData.image];
      console.log(`🖼️ Total images to upload: ${imagesToUpload.length}`);

      // Validate tất cả ảnh là data URL
      const allValid = imagesToUpload.every(img => 
        img && typeof img === 'string' && img.startsWith('data:image/')
      );

      if (allValid && imagesToUpload.length > 0) {
        console.log(`📸 Uploading ${imagesToUpload.length} image(s)...`);
        
        // Chuyển tất cả data URLs thành Files
        const files = imagesToUpload.map((img, index) => 
          dataURLToFile(img, `post-image-${index}.jpg`)
        );
        
        console.log(`📦 Created ${files.length} file(s), total size: ${files.reduce((sum, f) => sum + f.size, 0)} bytes`);
        
        // Upload nhiều ảnh
        const result = await createArticleWithMultipleUploads({
          files: files,
          title: postData.caption,
          content: postData.caption,
          visibility: postData.privacy || 'public',
          lat: postData.location.lat,
          lng: postData.location.lng,
          locationName: postData.location.name || `${postData.location.lat}, ${postData.location.lng}`,
          tags: []
        });
        console.log('✅ Upload success:', result);
        
        // ✅ Invalidate cache để user thấy bài mới ngay lập tức
        console.log('🗑️ Invalidating cache after creating new post...');
        api.invalidateArticlesCache();
        
        return result;
      } else {
        console.error('❌ Images are not valid data URLs!');
        console.error('Images:', imagesToUpload);
        throw new Error('Vui lòng chọn lại ảnh. Image format không hợp lệ.');
      }
    } catch (error) {
      console.error('❌ Error in handleShare:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        status: error.status
      });
      
      // ✨ Xử lý Rate Limiting (429) - Chặn spam hiệu quả ✨
      if (error.status === 429 || error.message?.includes('đợi')) {
        // Extract wait time from error message
        const match = error.message.match(/(\d+)s/);
        const waitTime = match ? parseInt(match[1]) : 30;
        
        console.log(`🚫 Rate limit hit! Cooldown: ${waitTime}s`);
        
        // Gọi hàm xử lý Cooldown tập trung
        startCooldownTimer(waitTime);

        // Không ném lỗi nữa, chỉ return để tránh hiển thị lỗi 2 lần
        return;
      }
      // ------------------------------------------------------------------------------------
      
      // Hiển thị thông báo lỗi cho các lỗi khác
      if (window.showSuccessToast) {
        const errorMsg = error.status === 401
          ? '🔒 Vui lòng đăng nhập lại'
          : error.status === 400
          ? `❌ ${error.message || 'Dữ liệu không hợp lệ'}`
          : error.status === 500
          ? '⚠️ Lỗi server, vui lòng thử lại sau'
          : `❌ ${error.message || 'Có lỗi xảy ra'}`;
        window.showSuccessToast(errorMsg);
      }
      
      throw error;
    } finally {
      setIsPosting(false);
    }
  }, [getIdToken, refreshAuth, dataURLToFile, editMode, editPostData, isPosting, cooldownTime, startCooldownTimer]);

  return (
    <CreatePostModalContext.Provider
      value={{ 
        isOpen, 
        openModal,
        openEditModal,
        closeModal, 
        step, 
        setStep, 
        image, 
        setImage, 
        aspect, 
        setAspect,
        handleShare,
        editMode,
        editPostData,
        caption,
        setCaption,
        privacy,
        setPrivacy,
        isPosting,
        cooldownTime
      }}
    >
      {children}
    </CreatePostModalContext.Provider>
  );
}

export function useCreatePostModal() {
  const context = useContext(CreatePostModalContext);
  if (!context) {
    throw new Error("useCreatePostModal must be used within CreatePostModalProvider");
  }
  return context;
}