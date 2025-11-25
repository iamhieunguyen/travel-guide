import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Register from "../components/Register";
import Login from "../components/Login";
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

  // ✅ Callback khi Register yêu cầu chuyển sang Login (sau OTP thành công)
  const handleSwitchToLogin = () => {
    if (isRegister) {
      handleToggleMode(); // Gọi animation như click nút login
    } else {
      navigate(`/auth?mode=login`, { replace: true });
    }
  };

  return (
    <div className="auth-wrapper bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Floating particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="floating-particle" style={{ top: '10%', left: '10%', animationDelay: '0s' }} />
        <div className="floating-particle" style={{ top: '20%', right: '15%', animationDelay: '2s' }} />
        <div className="floating-particle" style={{ bottom: '30%', left: '20%', animationDelay: '4s' }} />
        <div className="floating-particle" style={{ bottom: '20%', right: '25%', animationDelay: '3s' }} />
      </div>

      <div ref={containerRef} className="auth-container">
        {/* LOGIN FORM */}
        <div className="form-box login">
          <div className="form-content">
            <Login embed />
          </div>
        </div>

        {/* REGISTER FORM */}
        <div className="form-box register">
          <div className="form-content">
            {/* ✅ Truyền callback xuống Register */}
            <Register embed onSwitchToLogin={handleSwitchToLogin} />
          </div>
        </div>

        {/* TOGGLE PANEL */}
        <div className="toggle-box">
          <div className="toggle-panel toggle-left">
            <h1 className="text-3xl font-semibold mb-2">Xin chào, Chào mừng!</h1>
            <p className="mb-4">Chưa có tài khoản?</p>
            <button className="btn" onClick={handleToggleMode}>
              Đăng ký
            </button>
          </div>

          <div className="toggle-panel toggle-right">
            <h1 className="text-3xl font-semibold mb-2">Chào mừng trở lại!</h1>
            <p className="mb-4">Đã có tài khoản?</p>
            <button className="btn" onClick={handleToggleMode}>
              Đăng nhập
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
