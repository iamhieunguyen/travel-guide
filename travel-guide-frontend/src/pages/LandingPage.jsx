// src/pages/LandingPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/cognito";

export default function LandingPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // ✅ Kiểm tra nếu user đang đăng nhập (hoặc remember me)
  useEffect(() => {
    const checkUser = async () => {
      const current = await getCurrentUser();
      if (current) setUser(current);
    };
    checkUser();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div
          className="text-2xl font-bold cursor-pointer"
          onClick={() => navigate("/")}
        >
          🌍 Travel Guide
        </div>

        <div>
          {user ? (
            // ✅ Nếu đã đăng nhập → chỉ hiện nút "Trang chủ"
            <button
              onClick={() => navigate("/home")}
              className="ml-3 px-6 py-2 bg-yellow-400 text-gray-900 font-medium rounded-lg hover:bg-yellow-300 transition"
            >
              Trang chủ
            </button>
          ) : (
            // ❌ Nếu chưa đăng nhập → hiện hai nút
            <>
              <button
                onClick={() => navigate("/auth?mode=login")}
                className="px-4 py-2 rounded-lg hover:bg-white/10 transition"
              >
                Đăng nhập
              </button>
              <button
                onClick={() => navigate("/auth?mode=register")}
                className="ml-3 px-6 py-2 bg-white text-indigo-700 font-medium rounded-lg hover:bg-gray-100 transition"
              >
                Bắt đầu ngay
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 text-center max-w-3xl">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Khám Phá Thế Giới <br />{" "}
          <span className="text-yellow-300">Không Giới Hạn</span>
        </h1>
        <p className="text-xl text-blue-100 mb-10">
          Hướng dẫn du lịch chi tiết, trải nghiệm địa phương chân thực, và
          hành trình được cá nhân hóa — tất cả trong một ứng dụng.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {user ? (
            // ✅ Nếu đã đăng nhập → chỉ hiện nút đi đến home
            <button
              onClick={() => navigate("/home")}
              className="px-8 py-4 bg-yellow-400 text-gray-900 font-bold text-lg rounded-xl hover:bg-yellow-300 transition shadow-lg"
            >
              Đi đến Trang chủ
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate("/auth?mode=register")}
                className="px-8 py-4 bg-yellow-400 text-gray-900 font-bold text-lg rounded-xl hover:bg-yellow-300 transition shadow-lg"
              >
                Tạo tài khoản miễn phí
              </button>
              <button
                onClick={() => navigate("/home")}
                className="px-8 py-4 bg-transparent border-2 border-white text-white font-medium text-lg rounded-xl hover:bg-white/10 transition"
              >
                Xem bản demo
              </button>
            </>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        {[
          {
            icon: "🗺️",
            title: "Hướng dẫn chi tiết",
            desc: "Từng ngõ ngách, từng quán ăn địa phương",
          },
          {
            icon: "🔒",
            title: "An toàn & Riêng tư",
            desc: "Dữ liệu của bạn luôn được bảo vệ",
          },
          {
            icon: "📱",
            title: "Trải nghiệm liền mạch",
            desc: "Hoạt động trên mọi thiết bị",
          },
        ].map((item, i) => (
          <div key={i} className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl">
            <div className="text-4xl mb-4">{item.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
            <p className="text-blue-100">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
