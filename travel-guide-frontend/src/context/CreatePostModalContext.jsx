// context/CreatePostModalContext.jsx
import React, { createContext, useContext, useState, useCallback } from "react";
import { useAuth } from './AuthContext';
import api from '../services/article';

const CreatePostModalContext = createContext();

export function CreatePostModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [image, setImage] = useState(null);
  const [aspect, setAspect] = useState("1:1");
  const [editMode, setEditMode] = useState(false);
  const [editPostData, setEditPostData] = useState(null);
  const { getIdToken, refreshAuth } = useAuth();

  const openModal = useCallback(() => {
    if (!getIdToken()) {
      alert('Vui lòng đăng nhập để tạo bài đăng');
      return;
    }
    setIsOpen(true);
    setStep(1);
    setImage(null);
    setAspect("1:1");
    setEditMode(false);
    setEditPostData(null);
  }, [getIdToken]);

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
  }, []);

  // Di chuyển dataURLToFile ra ngoài để tránh dependency loop
  const dataURLToFile = useCallback((dataurl, filename) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
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
        };
        
        const result = await api.updateArticle(editPostData.articleId, updateData);
        console.log('✅ Update success:', result);
        return result;
      }
      
      // Nếu đang tạo mới
      console.log('🖼️ Image type:', typeof postData.image);
      console.log('🖼️ Image value:', postData.image);
      
      // Check if image is array (from ImageSelector)
      const imageToUpload = Array.isArray(postData.image) ? postData.image[0] : postData.image;
      console.log('🖼️ Image to upload:', imageToUpload?.substring(0, 100));

      if (imageToUpload && typeof imageToUpload === 'string' && imageToUpload.startsWith('data:image/')) {
        console.log('📸 Uploading new image...');
        const file = dataURLToFile(imageToUpload, 'post-image.jpg');
        console.log('📦 File created:', file.size, 'bytes');
        
        const result = await api.createArticleWithUpload({
          file: file,
          title: postData.caption,
          content: postData.caption,
          visibility: postData.privacy || 'public',
          lat: postData.location.lat,
          lng: postData.location.lng,
          tags: []
        });
        console.log('✅ Upload success:', result);
        return result;
      } else {
        console.error('❌ Image is not a data URL!');
        console.error('Image value:', imageToUpload);
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
        editPostData
      }}
    >
      {children}
    </CreatePostModalContext.Provider>
  );
}

export function useCreatePostModal() {
  const context = useContext(CreatePostModalContext);
  if (!context) {
    throw new Error(
      "useCreatePostModal must be used within CreatePostModalProvider"
    );
  }
  return context;
}