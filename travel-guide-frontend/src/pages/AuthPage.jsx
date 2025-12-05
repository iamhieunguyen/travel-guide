// pages/AuthPage.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { RegisterForm, LoginForm } from "../components/auth";
import "../index.css";

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const mode = params.get("mode") || "login";

  const [isRegister, setIsRegister] = useState(mode === "register");
  const [animating, setAnimating] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (isRegister) containerRef.current.classList.add("active");
    else containerRef.current.classList.remove("active");
  }, [isRegister]);

  const handleToggleMode = () => {
    if (animating) return;
    setAnimating(true);
    const newMode = isRegister ? "login" : "register";
    setIsRegister(!isRegister);
    navigate(`/auth?mode=${newMode}`, { replace: true });
    setTimeout(() => setAnimating(false), 1200);
  };

  const handleSwitchToLogin = () => {
    if (isRegister) handleToggleMode();
    else navigate(`/auth?mode=login`, { replace: true });
  };

  return (
    <div className="auth-wrapper bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="floating-particle" style={{ top: '10%', left: '10%', animationDelay: '0s' }} />
        <div className="floating-particle" style={{ top: '20%', right: '15%', animationDelay: '2s' }} />
        <div className="floating-particle" style={{ bottom: '30%', left: '20%', animationDelay: '4s' }} />
        <div className="floating-particle" style={{ bottom: '20%', right: '25%', animationDelay: '3s' }} />
      </div>

      <div ref={containerRef} className="auth-container">
        <div className="form-box login">
          <div className="form-content">
            <LoginForm embed />
          </div>
        </div>

        <div className="form-box register">
          <div className="form-content">
            <RegisterForm embed onSwitchToLogin={handleSwitchToLogin} />
          </div>
        </div>

        <div className="toggle-box">
          <div className="toggle-panel toggle-left">
            <h1 className="text-3xl font-semibold mb-2">Xin chào, Chào mừng!</h1>
            <p className="mb-4">Chưa có tài khoản?</p>
            <button className="btn" onClick={handleToggleMode}>Đăng ký</button>
          </div>
          <div className="toggle-panel toggle-right">
            <h1 className="text-3xl font-semibold mb-2">Chào mừng trở lại!</h1>
            <p className="mb-4">Đã có tài khoản?</p>
            <button className="btn" onClick={handleToggleMode}>Đăng nhập</button>
          </div>
        </div>
      </div>
    </div>
  );
}
