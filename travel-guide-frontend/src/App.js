// App.js
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from './context/AuthContext';
import { CreatePostModalProvider } from './context/CreatePostModalContext';
import CreatePostModal from './components/CreatePost/CreatePostModal';
import SuccessToast from './components/SuccessToast';
import ConfirmDialog from './components/ConfirmDialog';
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import PostListPage from "./pages/PostListPage";

// Global functions
window.showSuccessToast = null;
window.showConfirmDialog = null;

export default function App() {
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  // Expose functions globally
  React.useEffect(() => {
    window.showSuccessToast = (message) => {
      setToast(message);
    };
    
    window.showConfirmDialog = (message) => {
      return new Promise((resolve) => {
        setConfirm({
          message,
          onConfirm: () => {
            setConfirm(null);
            resolve(true);
          },
          onCancel: () => {
            setConfirm(null);
            resolve(false);
          }
        });
      });
    };
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <CreatePostModalProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/posts" element={<PostListPage />} />
          </Routes>
          <CreatePostModal />
          {toast && (
            <SuccessToast
              message={toast}
              onClose={() => setToast(null)}
            />
          )}
          {confirm && (
            <ConfirmDialog
              message={confirm.message}
              onConfirm={confirm.onConfirm}
              onCancel={confirm.onCancel}
            />
          )}
        </CreatePostModalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}