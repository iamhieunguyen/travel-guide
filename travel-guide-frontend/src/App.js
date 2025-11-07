import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import CreatePostPage from "./pages/CreatePost/CreatePostPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/create-post" element={<CreatePostPage />} />
      </Routes>
    </BrowserRouter>
  );
}
