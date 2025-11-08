import React, { createContext, useContext, useState } from "react";

const CreatePostModalContext = createContext();

export function CreatePostModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [image, setImage] = useState(null);
  const [aspect, setAspect] = useState("1:1");

  const openModal = () => {
    setIsOpen(true);
    setStep(1);
    setImage(null);
    setAspect("1:1");
  };

  const closeModal = () => setIsOpen(false);

  return (
    <CreatePostModalContext.Provider
      value={{ isOpen, openModal, closeModal, step, setStep, image, setImage, aspect, setAspect }}
    >
      {children}
    </CreatePostModalContext.Provider>
  );
}

export function useCreatePostModal() {
  const context = useContext(CreatePostModalContext);
  if (!context) {
    throw new Error(
      "useCreatePostModal phải được dùng bên trong CreatePostModalProvider"
    );
  }
  return context;
}
