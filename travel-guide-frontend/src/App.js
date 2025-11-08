import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import { CreatePostModalProvider } from "./components/CreatePost/CreatePostModalContext";

export default function App() {
  return (
    <CreatePostModalProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </BrowserRouter>
    </CreatePostModalProvider>
  );
}
