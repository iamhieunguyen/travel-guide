// App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from './context/AuthContext';
import { CreatePostModalProvider } from './context/CreatePostModalContext';
import CreatePostModal from './components/CreatePost/CreatePostModal';
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage/LandingPage";
import HomePage from "./pages/HomePage/HomePage";
import PersonalPage from "./pages/PersonalPage/PersonalPage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";
import PostListPage from "./pages/PostListPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CreatePostModalProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/personal" element={<PersonalPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/posts" element={<PostListPage />} />
          </Routes>
          <CreatePostModal />
        </CreatePostModalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}