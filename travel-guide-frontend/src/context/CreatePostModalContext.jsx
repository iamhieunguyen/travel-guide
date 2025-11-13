// context/CreatePostModalContext.jsx
import React, { createContext, useContext, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/article";

const CreatePostModalContext = createContext();

export function CreatePostModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [image, setImage] = useState(null);
  const [aspect, setAspect] = useState("1:1");
  const { getIdToken, refreshAuth } = useAuth();

  const openModal = useCallback(() => {
    if (!getIdToken()) {
      alert("Vui lòng đăng nhập để tạo bài đăng");
      return;
    }
    setIsOpen(true);
    setStep(1);
    setImage(null);
    setAspect("1:1");
  }, [getIdToken]);

  const closeModal = useCallback(() => setIsOpen(false), []);

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

  // Nếu FE truyền full URL (CloudFront/S3), tách ra imageKey (path sau domain)
  const normalizeImageKeyFromUrl = (maybeUrl) => {
    try {
      const url = new URL(maybeUrl);
      return url.pathname.replace(/^\/+/, ""); // bỏ dấu '/' đầu
    } catch {
      return maybeUrl; // không phải URL, giữ nguyên
    }
  };

  const handleShare = useCallback(
    async (postData) => {
      try {
        if (!getIdToken()) {
          const refreshed = await refreshAuth();
          if (!refreshed) {
            throw new Error("Vui lòng đăng nhập lại");
          }
        }

        // Validate tọa độ
        const lat = Number(postData?.location?.lat);
        const lng = Number(postData?.location?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          throw new Error("Thiếu toạ độ hợp lệ. Vui lòng chọn vị trí trên bản đồ.");
        }

        // 1) Ảnh là data URL -> convert & upload
        if (typeof postData.image === "string" && postData.image.startsWith("data:")) {
          const file = dataURLToFile(postData.image, "post-image.jpg");
          return await api.createArticleWithUpload({
            file,
            title: postData.caption,
            content: postData.caption,
            visibility: postData.privacy || "public",
            lat,
            lng,
            tags: Array.isArray(postData.tags) ? postData.tags : [],
          });
        }

        // 2) Ảnh là File/Blob -> upload
        if (postData.image instanceof File || postData.image instanceof Blob) {
          return await api.createArticleWithUpload({
            file: postData.image,
            title: postData.caption,
            content: postData.caption,
            visibility: postData.privacy || "public",
            lat,
            lng,
            tags: Array.isArray(postData.tags) ? postData.tags : [],
          });
        }

        // 3) Ảnh là blob: URL -> fetch blob rồi upload
        if (typeof postData.image === "string" && postData.image.startsWith("blob:")) {
          const resp = await fetch(postData.image);
          const blob = await resp.blob();
          const file = new File([blob], "post-image.jpg", {
            type: blob.type || "image/jpeg",
          });
          return await api.createArticleWithUpload({
            file,
            title: postData.caption,
            content: postData.caption,
            visibility: postData.privacy || "public",
            lat,
            lng,
            tags: Array.isArray(postData.tags) ? postData.tags : [],
          });
        }

        // 4) Có sẵn imageKey hoặc full URL (CloudFront/S3) -> tạo trực tiếp
        const imageKey =
          typeof postData.image === "string" && postData.image
            ? normalizeImageKeyFromUrl(postData.image)
            : undefined;

        return await api.createArticle({
          title: postData.caption,
          content: postData.caption,
          visibility: postData.privacy || "public",
          lat,
          lng,
          imageKey,
          tags: Array.isArray(postData.tags) ? postData.tags : [],
        });
      } catch (error) {
        console.error("Error sharing post:", error);
        throw error;
      }
    },
    [getIdToken, refreshAuth, dataURLToFile]
  );

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
        handleShare,
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
