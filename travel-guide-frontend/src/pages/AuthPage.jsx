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
    <div className="auth-wrapper bg-gray-700 min-h-screen flex items-center justify-center">
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
            <h1 className="text-3xl font-semibold mb-2">Hello, Welcome!</h1>
            <p className="mb-4">Don’t have an account yet</p>
            <button className="btn" onClick={handleToggleMode}>
              Register
            </button>
          </div>

          <div className="toggle-panel toggle-right">
            <h1 className="text-3xl font-semibold mb-2">Welcome Back!</h1>
            <p className="mb-4">Already have an account?</p>
            <button className="btn" onClick={handleToggleMode}>
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
