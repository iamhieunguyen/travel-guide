// App.js
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CreatePostModalProvider } from './contexts/CreatePostModalContext';
import CreatePostModal from './components/CreatePost/CreatePostModal';
import { SuccessToast, ConfirmDialog } from './components/common';
import SessionExpiredModal from './components/common/SessionExpiredModal';
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage/LandingPage";
import HomePage from "./pages/HomePage";
import PersonalPage from './pages/PersonalPage/PersonalPage';
import SettingsPage from './pages/SettingsPage/SettingsPage';
import SmartGalleryPage from './pages/SmartGalleryPage';
import TagGalleryPage from './pages/TagGalleryPage';

// Global functions
window.showSuccessToast = null;
window.showConfirmDialog = null;

function AppContent() {
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { showSessionExpiredModal, closeSessionExpiredModal } = useAuth();

  React.useEffect(() => {
    window.showSuccessToast = (message) => setToast(message);
    window.showConfirmDialog = (message) => {
      return new Promise((resolve) => {
        setConfirm({
          message,
          onConfirm: () => { setConfirm(null); resolve(true); },
          onCancel: () => { setConfirm(null); resolve(false); }
        });
      });
    };
  }, []);

  return (
    <>
      <CreatePostModalProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/personal" element={<PersonalPage />} />
          <Route path='/settings' element={<SettingsPage />} />
          <Route path="/gallery" element={<SmartGalleryPage />} />
          <Route path="/gallery/tag/:tagName" element={<TagGalleryPage />} />
        </Routes>
        <CreatePostModal />
        {toast && <SuccessToast message={toast} onClose={() => setToast(null)} />}
        {confirm && <ConfirmDialog message={confirm.message} onConfirm={confirm.onConfirm} onCancel={confirm.onCancel} />}
        <SessionExpiredModal isOpen={showSessionExpiredModal} onClose={closeSessionExpiredModal} />
      </CreatePostModalProvider>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
