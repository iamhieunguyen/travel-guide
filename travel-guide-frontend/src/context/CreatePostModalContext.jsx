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
  }, [getIdToken]);

  const closeModal = useCallback(() => setIsOpen(false), []);

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
      if (!getIdToken()) {
        // Thử refresh auth
        const refreshed = await refreshAuth();
        if (!refreshed) {
          throw new Error('Vui lòng đăng nhập lại');
        }
      }

      if (postData.image && typeof postData.image === 'string' && postData.image.startsWith('')) {
        const file = dataURLToFile(postData.image, 'post-image.jpg');
        const result = await api.createArticleWithUpload({
          file: file,
          title: postData.caption,
          content: postData.caption,
          visibility: postData.privacy || 'public',
          lat: postData.location.lat,
          lng: postData.location.lng,
          tags: []
        });
        return result;
      } else {
        return await api.createArticle({
          title: postData.caption,
          content: postData.caption,
          visibility: postData.privacy || 'public',
          lat: postData.location.lat,
          lng: postData.location.lng,
          imageKey: postData.image,
          tags: []
        });
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      throw error;
    }
  }, [getIdToken, refreshAuth, dataURLToFile]); // Thêm dataURLToFile vào dependency

  return (
    <CreatePostModalContext.Provider
      value={{ 
        isOpen, 
        openModal, 
        closeModal, 
        step, 
        setStep, 
        image, 
        setImage, 
        aspect, 
        setAspect,
        handleShare
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