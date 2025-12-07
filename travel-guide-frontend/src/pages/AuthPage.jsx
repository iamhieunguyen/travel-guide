import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import Register from "../components/Register";
import Login from "../components/Login";
import "../index.css";

const TEXT = {
  vi: {
    backToHome: 'Quay về trang chủ',
    welcome: 'Xin chào, Chào mừng!',
    noAccount: 'Chưa có tài khoản?',
    signUp: 'Đăng ký',
    welcomeBack: 'Chào mừng trở lại!',
    haveAccount: 'Đã có tài khoản?',
    login: 'Đăng nhập',
  },
  en: {
    backToHome: 'Back to home',
    welcome: 'Hello, Welcome!',
    noAccount: "Don't have an account?",
    signUp: 'Sign Up',
    welcomeBack: 'Welcome back!',
    haveAccount: 'Already have an account?',
    login: 'Login',
  },
};

export default function AuthPage() {
  const { language } = useLanguage();
  const L = TEXT[language] || TEXT.vi;
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const mode = params.get("mode") || "login";

  const [isRegister, setIsRegister] = useState(mode === "register" || mode === "signup");
  const [animating, setAnimating] = useState(false);
  const containerRef = useRef(null);

  // Cập nhật isRegister khi mode trong URL thay đổi
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const currentMode = urlParams.get("mode") || "login";
    const shouldBeRegister = currentMode === "register" || currentMode === "signup";
    setIsRegister(shouldBeRegister);
  }, [location.search]);

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

      <div ref={containerRef} className="auth-container relative">
        {/* Close button to go back to landing page */}
        <button
          onClick={() => navigate('/')}
          className={`absolute top-4 left-4 z-50 p-2 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:rotate-90 ${
            isRegister 
              ? 'bg-cyan-500/90 hover:bg-cyan-500 text-white' 
              : 'bg-white/90 hover:bg-white text-gray-600 hover:text-gray-800'
          }`}
          title={L.backToHome}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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
            <h1 className="text-3xl font-semibold mb-2">{L.welcome}</h1>
            <p className="mb-4">{L.noAccount}</p>
            <button className="btn" onClick={handleToggleMode}>
              {L.signUp}
            </button>
          </div>

          <div className="toggle-panel toggle-right">
            <h1 className="text-3xl font-semibold mb-2">{L.welcomeBack}</h1>
            <p className="mb-4">{L.haveAccount}</p>
            <button className="btn" onClick={handleToggleMode}>
              {L.login}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
