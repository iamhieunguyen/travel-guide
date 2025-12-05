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
import { useCreatePostModal } from "../../context/CreatePostModalContext";
import CreatePostStyleHeader from "./CreatePostStyleHeader";

const TEXT = {
  vi: {
    dragDrop: 'Kéo ảnh hoặc video vào đây',
    supportedFormats: 'Hỗ trợ JPG, PNG, GIF • Tối đa 10MB',
    selectFromComputer: 'Chọn từ máy tính',
    next: 'Tiếp theo',
    aspectRatio: 'Tỷ lệ',
    original: 'Gốc',
    square: 'Vuông',
    portrait: 'Dọc',
    landscape: 'Ngang',
    back: '← Quay lại',
    addImage: 'Thêm ảnh',
    ratio: 'Tỉ lệ',
  },
  en: {
    dragDrop: 'Drag photo or video here',
    supportedFormats: 'Supports JPG, PNG, GIF • Max 10MB',
    selectFromComputer: 'Select from computer',
    next: 'Next',
    aspectRatio: 'Ratio',
    original: 'Original',
    square: 'Square',
    portrait: 'Portrait',
    landscape: 'Landscape',
    back: '← Back',
    addImage: 'Add image',
    ratio: 'Ratio',
  },
};

export default function ImageSelector({ onNext }) {
  const { setImage, aspect, setAspect, image, closeModal } = useCreatePostModal();
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [showAspectMenu, setShowAspectMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const aspectMenuRef = useRef(null);
  const dropZoneRef = useRef(null);
  const [language] = useState(() => {
    if (typeof window === 'undefined') return 'vi';
    return localStorage.getItem('appLanguage') || 'vi';
  });
  
  const L = TEXT[language] || TEXT.vi;

  // Load ảnh từ context khi quay lại
  useEffect(() => {
    if (image && Array.isArray(image) && image.length > 0) {
      setImages(image);
    }
  }, [image]);

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
    
    // Thêm ảnh mới vào cuối danh sách (giữ thứ tự chọn)
    const newUrls = files.map((file) => URL.createObjectURL(file));
    setImages(prev => [...prev, ...newUrls]);
    
    // Nếu chưa có ảnh nào, set index = 0
    if (images.length === 0) {
      setCurrentIndex(0);
    }
  };

  // Drag & Drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      const newUrls = files.map((file) => URL.createObjectURL(file));
      setImages(prev => [...prev, ...newUrls]);
      
      if (images.length === 0) {
        setCurrentIndex(0);
      }
    }
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
    // Xóa ảnh và quay về màn hình upload
    setImages([]);
    setZoom(100);
    setCurrentIndex(0);
    setAspect("1:1");
  };

  const handleNext = async () => {
    try {
      console.log('🔄 Converting blob URLs to data URLs...');
      
      // Convert blob URLs to data URLs
      const dataURLPromises = images.map((blobUrl) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              const dataURL = canvas.toDataURL('image/jpeg', 0.9);
              console.log('✅ Converted:', dataURL.substring(0, 50));
              resolve(dataURL);
            } catch (error) {
              console.error('❌ Canvas error:', error);
              reject(error);
            }
          };
          
          img.onerror = (error) => {
            console.error('❌ Image load error:', error);
            reject(error);
          };
          
          img.src = blobUrl;
        });
      });
      
      const dataURLs = await Promise.all(dataURLPromises);
      console.log('✅ All images converted:', dataURLs.length);
      
      setImage(dataURLs);
      onNext();
    } catch (error) {
      console.error('❌ Error converting images:', error);
      alert('Lỗi khi xử lý ảnh. Vui lòng thử lại.');
    }
  };

  const aspectRatios = [
    { label: L.original, value: "original" },
    { label: "1:1", value: "1:1" },
    { label: "4:5", value: "4:5" },
    { label: "16:9", value: "16:9" },
  ];

  const nextImage = () =>
    setCurrentIndex((prev) => (prev + 1) % images.length);
  const prevImage = () =>
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  const getAspectStyle = () => {
    if (aspect === "original") return "auto";
    if (aspect === "1:1") return "100%";
    if (aspect === "4:5") return `${(5 / 4) * 100}%`;
    if (aspect === "16:9") return `${(9 / 16) * 100}%`;
    return "100%";
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-50 p-4">
      <div className="bg-[#f5f3f0] shadow-2xl w-full max-w-[1100px] flex flex-col relative animate-fadeIn" style={{
        borderRadius: "24px",
        overflow: "visible"
      }}>
        <CreatePostStyleHeader />
        
        <div className="absolute top-3 left-3 z-40">
          <button
            onClick={images.length > 0 ? handleRemoveAll : closeModal}
            className="bg-white/95 hover:bg-white text-gray-600 hover:text-gray-800 p-2.5 rounded-full shadow-xl backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:rotate-90"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center bg-[#f5f3f0] relative pt-6 pb-4 overflow-hidden" style={{ minHeight: "700px", zIndex: 10, borderBottomLeftRadius: "24px", borderBottomRightRadius: "24px" }}>
          {images.length === 0 ? (
            <>
              <div 
                ref={dropZoneRef}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="flex flex-col items-center justify-center w-full h-full group px-4"
              >
                <div 
                  onClick={triggerFileSelect}
                  className={`flex flex-col items-center space-y-8 p-24 rounded-[45px] bg-white/95 backdrop-blur-md shadow-2xl border-2 border-dashed transition-all duration-500 group-hover:scale-[1.01] relative max-w-[700px] w-full cursor-pointer ${
                    isDragging 
                      ? 'border-[#92ADA4] bg-[#92ADA4]/10 scale-[1.02]' 
                      : 'border-[#92ADA4]/40 group-hover:border-[#92ADA4] group-hover:shadow-[#92ADA4]/20'
                  }`}
                  style={{ zIndex: 30 }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#92ADA4] rounded-full blur-2xl opacity-40 animate-pulse"></div>
                    <div className="relative bg-[#92ADA4]/20 p-6 rounded-full">
                      <ImageIcon className="w-20 h-20 text-[#92ADA4]" strokeWidth={1.5} />
                    </div>
                  </div>
                  
                  <div className="text-center space-y-3">
                    <p className="text-gray-800 text-xl font-semibold">
                      {L.dragDrop}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {L.supportedFormats}
                    </p>
                  </div>
                  
                  <button className="bg-[#92ADA4] hover:bg-[#7d9a91] text-white px-10 py-3.5 rounded-full text-sm font-bold shadow-xl group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                    {L.selectFromComputer}
                  </button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </>
          ) : (
            <div
              ref={dropZoneRef}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`relative bg-black rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl animate-fadeIn transition-all ${
                isDragging ? 'ring-4 ring-[#92ADA4] ring-opacity-50' : ''
              }`}
              style={{
                width: "900px",
                height: "650px",
              }}
            >
              <div
                className="relative w-full h-full flex items-center justify-center"
              >
                <div
                  className="relative transition-all duration-300 ease-out"
                  style={{
                    width: aspect === "4:5" ? "496px" : "100%",
                    paddingTop: aspect === "original" ? "100%" : getAspectStyle(),
                  }}
                >
                  <img
                    src={images[currentIndex]}
                    alt={`Ảnh ${currentIndex + 1}`}
                    className="absolute top-0 left-0 w-full h-full object-cover transition-all duration-300 ease-out"
                    style={{
                      transform: `scale(${zoom / 100})`,
                    }}
                  />
                </div>
              </div>

              <div className="absolute bottom-6 left-6" ref={aspectMenuRef}>
                <button
                  onClick={() => setShowAspectMenu((p) => !p)}
                  className="bg-[#92ADA4]/90 hover:bg-[#7d9a91] text-white px-4 py-2 rounded-full flex items-center space-x-2 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <Crop size={18} />
                  <span className="text-sm font-medium">{L.ratio}</span>
                </button>

                {showAspectMenu && (
                  <div className="mt-3 flex flex-col bg-white/95 rounded-2xl p-3 space-y-2 w-32 backdrop-blur-sm shadow-xl border border-[#92ADA4]/20">
                    {aspectRatios.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setAspect(r.value)}
                        className={`flex items-center justify-between w-full px-3 py-2 rounded-xl transition-all duration-200 ${
                          aspect === r.value
                            ? "bg-[#92ADA4] text-white shadow-md"
                            : "hover:bg-[#92ADA4]/10 text-gray-700"
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
                  className="text-[#92ADA4] hover:text-[#7d9a91] p-1 rounded-full hover:bg-[#92ADA4]/10 transition"
                >
                  <Minus size={18} />
                </button>
                <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-center">
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom((prev) => Math.min(200, prev + 10))}
                  className="text-[#92ADA4] hover:text-[#7d9a91] p-1 rounded-full hover:bg-[#92ADA4]/10 transition"
                >
                  <Plus size={18} />
                </button>
              </div>

              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white text-[#92ADA4] p-3 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white text-[#92ADA4] p-3 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110"
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
              
              {/* Nút thêm ảnh */}
              <button
                onClick={triggerFileSelect}
                className="absolute top-4 right-4 bg-[#92ADA4]/90 hover:bg-[#7d9a91] text-white px-4 py-2 rounded-full flex items-center space-x-2 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-105"
              >
                <Plus size={18} />
                <span className="text-sm font-medium">{L.addImage}</span>
              </button>
              
              {/* Hidden file input for adding more images */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        {images.length > 0 && (
          <div className="flex justify-between items-center py-3 px-8 bg-gradient-to-b from-purple-50/20 to-[#f5f3f0] backdrop-blur-sm rounded-b-3xl">
            <button
              onClick={handleBack}
              className="px-7 py-2.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm border border-gray-200 hover:scale-105"
            >
              {L.back}
            </button>
            <button
              onClick={handleNext}
              className="px-10 py-2.5 bg-[#92ADA4] hover:bg-[#7d9a91] text-white rounded-full hover:shadow-2xl transition-all duration-300 hover:scale-110 font-bold text-sm shadow-xl"
            >
              {L.next} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
