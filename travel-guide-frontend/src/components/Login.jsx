// src/pages/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login, getCurrentUser } from "../services/cognito"; // 👈 thêm hàm check user

export default function Login({ embed = false }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ Nếu user vẫn đăng nhập, tự động chuyển sang /home
    const checkSession = async () => {
      const user = await getCurrentUser();
      if (user) {
        navigate("/home");
        return;
      }

      // ✅ Điền sẵn username nếu có
      const saved = localStorage.getItem("remember_username");
      if (saved) {
        setUsername(saved);
        setRemember(true);
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(username, password);

      if (remember) localStorage.setItem("remember_username", username);
      else localStorage.removeItem("remember_username");

      // Reload trang để đảm bảo AuthContext load user trước
      window.location.href = "/home";
    } catch (err) {
      setError(err.message || "Tên đăng nhập hoặc mật khẩu không đúng");
    }
  };

  if (embed) {
    return (
      <form onSubmit={handleSubmit} className="space-y-6 w-full text-[#0891b2]">
        <h2 className="text-2xl font-semibold text-[#06b6d4] text-center mb-2">Đăng nhập</h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        {/* Username */}
        <div className="relative mt-6">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder=" "
            className="peer w-full border border-[#06b6d4] rounded-2xl px-4 pt-6 pb-2 
              text-[#0891b2] bg-transparent outline-none focus:ring-2 focus:ring-[#06b6d4]/40 transition-all"
            required
          />
          <label
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#06b6d4] text-base bg-white px-1
              transition-all duration-200 ease-in-out
              peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:-translate-y-1/2
              peer-focus:top-1 peer-focus:text-xs peer-focus:-translate-y-0 peer-focus:text-[#06b6d4]
              peer-valid:top-1 peer-valid:text-xs peer-valid:-translate-y-0 peer-valid:text-[#06b6d4]"
          >
            Tên đăng nhập
          </label>
        </div>

        {/* Password */}
        <div className="relative mt-6">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder=" "
            className="peer w-full border border-[#06b6d4] rounded-2xl px-4 pt-6 pb-2 
              text-[#0891b2] bg-transparent outline-none focus:ring-2 focus:ring-[#06b6d4]/40 transition-all"
            required
          />
          <label
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#06b6d4] text-base bg-white px-1
              transition-all duration-200 ease-in-out
              peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:-translate-y-1/2
              peer-focus:top-1 peer-focus:text-xs peer-focus:-translate-y-0 peer-focus:text-[#06b6d4]
              peer-valid:top-1 peer-valid:text-xs peer-valid:-translate-y-0 peer-valid:text-[#06b6d4]"
          >
            Mật khẩu
          </label>
        </div>

        {/* Remember + Forgot password */}
        <div className="flex items-center justify-between text-sm mt-4">
          <label className="flex items-center gap-2 cursor-pointer select-none text-[#0891b2]">
            <input
              type="checkbox"
              checked={remember}
              onChange={() => setRemember(!remember)}
              className="h-5 w-5 text-[#06b6d4] border-[#06b6d4] rounded-2xl focus:ring-2 focus:ring-[#06b6d4]/40"
            />
            Ghi nhớ đăng nhập
          </label>

          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="text-[#06b6d4] hover:underline"
          >
            Quên mật khẩu?
          </button>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-[#0891b2] to-[#06b6d4] hover:from-[#0e7490] hover:to-[#0891b2] text-white font-medium py-3 rounded-2xl
            transition-all duration-300 shadow-md hover:shadow-xl hover:scale-[1.02] mt-6"
        >
          Đăng nhập
        </button>
      </form>
    );
  }

  return null;
}
