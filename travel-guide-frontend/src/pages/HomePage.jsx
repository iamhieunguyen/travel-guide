import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated, signOut } from "../services/cognito";
import CreatePostModal from "../components/CreatePost/CreatePostModal";
import { useCreatePostModal } from "../components/CreatePost/CreatePostModalContext"; // ✅ dùng context mới

export default function HomePage() {
  const navigate = useNavigate();
  const { openModal } = useCreatePostModal(); 

  // Kiểm tra đăng nhập
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/auth?mode=login", { replace: true });
    }
  }, [navigate]);

  // Đăng xuất
  const handleLogout = () => {
    signOut();
    localStorage.clear();
    navigate("/auth?mode=login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ✅ Modal tạo bài viết */}
      <CreatePostModal />

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div
            className="text-xl font-bold text-indigo-700 cursor-pointer"
            onClick={() => navigate("/home")}
          >
            Travel Guide
          </div>

          <div className="flex items-center space-x-4">
            <button
              className="text-gray-600 hover:text-indigo-600 font-medium"
              onClick={() => navigate("/explore")}
            >
              Khám phá
            </button>
            <button
              className="text-gray-600 hover:text-indigo-600 font-medium"
              onClick={() => navigate("/history")}
            >
              Lịch sử
            </button>

            {/* ✅ Nút tạo bài viết */}
            <button
              onClick={openModal}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              + Tạo bài viết
            </button>

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Chào mừng bạn trở lại!</h1>
          <p className="text-xl max-w-2xl mx-auto">
            Sẵn sàng cho chuyến đi tiếp theo? Hãy chọn điểm đến mơ ước của bạn.
          </p>
        </div>
      </section>

      {/* Map Placeholder */}
      <section className="container mx-auto px-4 py-12 flex-1">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Bản đồ hành trình
        </h2>
        <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-96 flex items-center justify-center text-gray-500">
          🌍 <span className="ml-2">Bản đồ tương tác sẽ hiển thị ở đây</span>
        </div>
        <p className="text-center text-gray-500 mt-4 text-sm">
          (Tích hợp Google Maps API sau khi có key)
        </p>
      </section>

      {/* Featured Destinations */}
      <section className="bg-white py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-10">
            Điểm đến nổi bật
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {["Đà Lạt", "Hà Nội", "Đà Nẵng", "Phú Quốc", "Sapa", "Huế"].map(
              (place, i) => (
                <div
                  key={i}
                  className="border rounded-xl overflow-hidden shadow-md hover:shadow-lg transition"
                >
                  <div className="h-48 bg-gradient-to-r from-blue-400 to-teal-500"></div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg">{place}</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      Khám phá văn hóa, ẩm thực và thiên nhiên
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
