import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Crop,
  X,
  Plus,
  Minus,
} from "lucide-react";
import { useCreatePostModal } from "../../../context/CreatePostModalContext";
import InstagramStyleHeader from "../CreatePostStyleHeader";

export default function ImageSelector({ onNext }) {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [showAspectMenu, setShowAspectMenu] = useState(false);
  const fileInputRef = useRef(null);
  const aspectMenuRef = useRef(null);
  const { setImage, aspect, setAspect } = useCreatePostModal();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (aspectMenuRef.current && !aspectMenuRef.current.contains(e.target)) {
        setShowAspectMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const urls = files.map((file) => URL.createObjectURL(file));
    setImages(urls);
    setCurrentIndex(0);
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleRemoveAll = () => {
    setImages([]);
    setZoom(100);
    setCurrentIndex(0);
  };

  const handleBack = () => {
    setImages([]);
    setZoom(100);
    setAspect("1:1");
    setCurrentIndex(0);
  };

  const handleNext = () => {
    setImage(images);
    onNext();
  };

  const aspectRatios = [
    { label: "1:1", value: "1:1" },
    { label: "4:5", value: "4:5" },
    { label: "16:9", value: "16:9" },
  ];

  const nextImage = () =>
    setCurrentIndex((prev) => (prev + 1) % images.length);
  const prevImage = () =>
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  const getAspectStyle = () => {
    if (aspect === "1:1") return "100%";
    if (aspect === "4:5") return `${(5 / 4) * 100}%`;
    if (aspect === "16:9") return `${(9 / 16) * 100}%`;
    return "100%";
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-50 p-4">
      <div className="bg-[#f5f3f0] shadow-2xl w-full max-w-[1000px] flex flex-col relative animate-fadeIn" style={{
        borderRadius: "24px",
        overflow: "visible"
      }}>
        {/* Curved top edge for avatar */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-[#f5f3f0] z-20" style={{
          clipPath: "ellipse(70px 40px at 50% 0%)"
        }}></div>

        {/* Cat Ears */}
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 w-full flex justify-between px-20 pointer-events-none">
          {/* Left Ear */}
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 bg-[#b8c89f] rounded-[60%_40%_0%_0%/60%_40%_0%_0%] transform -rotate-12"></div>
            <div className="absolute inset-3 bg-[#a0b088] rounded-[60%_40%_0%_0%/60%_40%_0%_0%] transform -rotate-12"></div>
          </div>
          {/* Right Ear */}
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 bg-[#a8d5e2] rounded-[40%_60%_0%_0%/40%_60%_0%_0%] transform rotate-12"></div>
            <div className="absolute inset-3 bg-[#90c0cd] rounded-[40%_60%_0%_0%/40%_60%_0%_0%] transform rotate-12"></div>
          </div>
        </div>

        <InstagramStyleHeader />
        
        <div className="absolute top-3 left-3 z-40">
          <button
            onClick={images.length > 0 ? handleRemoveAll : null}
            className="bg-white/95 hover:bg-white text-gray-600 hover:text-gray-800 p-2.5 rounded-full shadow-xl backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:rotate-90"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center bg-[#f5f3f0] relative pt-8 pb-8 overflow-hidden" style={{ minHeight: "560px", zIndex: 10, borderBottomLeftRadius: "24px", borderBottomRightRadius: "24px" }}>
          {images.length === 0 ? (
            <>
              {/* Decorative Blob Shapes - Only on upload screen */}
              <div 
                className="absolute bg-[#9db88a] transition-all duration-1000"
                style={{
                  top: "-25%",
                  right: "10%",
                  width: "280px",
                  height: "400px",
                  borderRadius: "50% 50% 50% 50% / 50% 50% 50% 50%",
                  animation: "blob1 8s ease-in-out infinite",
                  zIndex: 5,
                }}
              ></div>
              
              <div 
                className="absolute bg-[#9db88a] transition-all duration-1000"
                style={{
                  top: "-10%",
                  left: "5%",
                  width: "320px",
                  height: "420px",
                  borderRadius: "50% 50% 50% 50% / 50% 50% 50% 50%",
                  animation: "blob2 10s ease-in-out infinite",
                  zIndex: 5,
                }}
              ></div>
              
              <div 
                className="absolute bg-[#a8d5e2] transition-all duration-1000"
                style={{
                  bottom: "-10%",
                  right: "8%",
                  width: "200px",
                  height: "300px",
                  borderRadius: "50% 50% 50% 50% / 50% 50% 50% 50%",
                  animation: "blob3 7s ease-in-out infinite",
                  zIndex: 5,
                }}
              ></div>

              <label
                onClick={triggerFileSelect}
                className="flex flex-col items-center justify-center w-full h-full cursor-pointer group px-4"
              >
              <div className="flex flex-col items-center space-y-8 p-24 rounded-[45px] bg-white/95 backdrop-blur-md shadow-2xl border-2 border-dashed border-pink-400 group-hover:border-pink-500 transition-all duration-500 group-hover:scale-[1.01] group-hover:shadow-pink-200/50 relative max-w-[700px] w-full" style={{ zIndex: 30 }}>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 rounded-full blur-2xl opacity-40 animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-pink-100 to-purple-100 p-6 rounded-full">
                    <ImageIcon className="w-20 h-20 text-pink-600" strokeWidth={1.5} />
                  </div>
                </div>
                
                <div className="text-center space-y-3">
                  <p className="text-gray-800 text-xl font-semibold">
                    Kéo ảnh hoặc video vào đây
                  </p>
                  <p className="text-gray-500 text-sm">
                    Hỗ trợ JPG, PNG, GIF • Tối đa 10MB
                  </p>
                </div>
                
                <button className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white px-10 py-3.5 rounded-full text-sm font-bold shadow-xl group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600">
                  Chọn từ máy tính
                </button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              </label>
            </>
          ) : (
            <div
              className="relative bg-black rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-300 shadow-2xl"
              style={{
                width: "620px",
                height: "620px",
              }}
            >
              <div
                className="relative w-full"
                style={{
                  paddingTop: getAspectStyle(),
                  maxHeight: "100%",
                  overflow: "hidden",
                }}
              >
                <img
                  src={images[currentIndex]}
                  alt={`Ảnh ${currentIndex + 1}`}
                  className="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-300"
                  style={{
                    transform: `scale(${zoom / 100})`,
                  }}
                />
              </div>

              <div className="absolute bottom-6 left-6" ref={aspectMenuRef}>
                <button
                  onClick={() => setShowAspectMenu((p) => !p)}
                  className="bg-gradient-to-r from-pink-500/90 to-purple-500/90 hover:from-pink-600 hover:to-purple-600 text-white px-4 py-2 rounded-full flex items-center space-x-2 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <Crop size={18} />
                  <span className="text-sm font-medium">Tỉ lệ</span>
                </button>

                {showAspectMenu && (
                  <div className="mt-3 flex flex-col bg-white/95 rounded-2xl p-3 space-y-2 w-32 backdrop-blur-sm shadow-xl border border-pink-100">
                    {aspectRatios.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setAspect(r.value)}
                        className={`flex items-center justify-between w-full px-3 py-2 rounded-xl transition-all duration-200 ${
                          aspect === r.value
                            ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md"
                            : "hover:bg-pink-50 text-gray-700"
                        }`}
                      >
                        <span className="font-medium">{r.label}</span>
                        <div
                          className={`border-2 w-4 h-4 rounded ${
                            aspect === r.value
                              ? "border-white bg-white/20"
                              : "border-gray-400"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="absolute bottom-6 right-6 flex items-center space-x-3 bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                <button
                  onClick={() => setZoom((prev) => Math.max(50, prev - 10))}
                  className="text-pink-500 hover:text-pink-600 p-1 rounded-full hover:bg-pink-50 transition"
                >
                  <Minus size={18} />
                </button>
                <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-center">
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom((prev) => Math.min(200, prev + 10))}
                  className="text-pink-500 hover:text-pink-600 p-1 rounded-full hover:bg-pink-50 transition"
                >
                  <Plus size={18} />
                </button>
              </div>

              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white text-pink-500 p-3 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white text-pink-500 p-3 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110"
                  >
                    <ChevronRight size={22} />
                  </button>
                </>
              )}

              {images.length > 1 && (
                <div className="absolute top-4 flex space-x-2 justify-center w-full">
                  {images.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        i === currentIndex 
                          ? "bg-white w-8 shadow-lg" 
                          : "bg-white/40 w-1"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {images.length > 0 && (
          <div className="flex justify-between items-center py-5 px-8 bg-gradient-to-b from-purple-50/20 to-[#f5f3f0] backdrop-blur-sm rounded-b-3xl">
            <button
              onClick={handleBack}
              className="px-7 py-2.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm border border-gray-200 hover:scale-105"
            >
              ← Quay lại
            </button>
            <button
              onClick={handleNext}
              className="px-10 py-2.5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white rounded-full hover:shadow-2xl transition-all duration-300 hover:scale-110 font-bold text-sm shadow-xl hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600"
            >
              Tiếp tục →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
