import { useCreatePostModal as useCreatePostContext } from '../context/CreatePostModalContext';

export const useCreatePost = () => {
  const context = useCreatePostContext();
  if (!context) {
    throw new Error('useCreatePost must be used within CreatePostModalProvider');
  }
  return context;
};