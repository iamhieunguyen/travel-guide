// App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from './context/AuthContext';
import { CreatePostModalProvider } from './context/CreatePostModalContext';
import CreatePostModal from './components/CreatePost/CreatePostModal';
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import PostListPage from "./pages/PostListPage";

export default function App() {
  return (
    <AuthProvider>
      <CreatePostModalProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/posts" element={<PostListPage />} />
          </Routes>
          <CreatePostModal />
        </BrowserRouter>
      </CreatePostModalProvider>
    </AuthProvider>
  );
}