// context/CreatePostModalContext.jsx
import React, { createContext, useContext, useState, useCallback } from "react";
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
  const { getIdToken, refreshAuth, user } = useAuth();

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
    // Set image from post
    if (post.imageKey) {
      const imageUrl = post.imageKey.startsWith('http') 
        ? post.imageKey 
        : `https://${process.env.REACT_APP_CF_DOMAIN}/${post.imageKey}`;
      setImage(imageUrl);
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
        
        const result = await api.updateArticle(editPostData.articleId, updateData);
        console.log('✅ Update success:', result);
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
        stack: error.stack
      });
      throw error;
    }
  }, [getIdToken, refreshAuth, dataURLToFile, editMode, editPostData]);

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
        setPrivacy
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
