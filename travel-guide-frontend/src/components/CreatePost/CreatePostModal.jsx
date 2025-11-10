// components/CreatePost/CreatePostModal.jsx
import { useCreatePostModal } from "../../context/CreatePostModalContext";
import ImageSelector from "./ImageSelector/ImageSelector";
import PostDetails from "./PostDetails/PostDetails";
import InstagramStyleHeader from "./CreatePostStyleHeader";
import { X } from "lucide-react";

export default function CreatePostModal() {
  const { isOpen, closeModal, step, setStep, image, handleShare } = useCreatePostModal();

  if (!isOpen) return null;

  return (
    <>
      {step === 1 && <ImageSelector onNext={() => setStep(2)} />}
      {step === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#f5f3f0] shadow-2xl w-full max-w-[900px] flex flex-col relative animate-fadeIn" style={{
            borderRadius: "24px",
            overflow: "visible"
          }}>
            {/* Curved top edge for avatar */}
            <div className="absolute top-0 left-0 right-0 h-12 bg-[#f5f3f0] z-20" style={{
              clipPath: "ellipse(70px 40% at 50% 0%)"
            }}></div>

            {/* Decorative Cats - Cute illustrations in corners */}
            {/* Bottom Left Cat - White with brown spots */}
            <div className="absolute bottom-8 left-6 z-5 opacity-90" style={{ animation: "float 3s ease-in-out infinite" }}>
              <div className="relative w-24 h-20">
                {/* Cat body */}
                <div className="absolute bottom-0 left-0 w-20 h-14 bg-white rounded-[60%_40%_50%_50%/60%_60%_40%_40%] shadow-lg"></div>
                {/* Brown spots */}
                <div className="absolute top-1 left-2 w-8 h-6 bg-[#8B7355] rounded-[50%_60%_40%_50%/50%_50%_50%_40%]"></div>
                <div className="absolute top-2 right-3 w-6 h-5 bg-[#8B7355] rounded-[60%_40%_50%_50%/50%_60%_40%_50%]"></div>
                {/* Tail */}
                <div className="absolute -top-2 right-0 w-3 h-12 bg-[#4A4A4A] rounded-full transform rotate-45"></div>
                {/* Head */}
                <div className="absolute top-0 left-4 w-10 h-9 bg-white rounded-[50%_50%_40%_40%/60%_60%_50%_50%] shadow-md"></div>
                {/* Ears */}
                <div className="absolute -top-1 left-5 w-3 h-3 bg-[#FFB6C1] rounded-[50%_50%_0%_50%] border-2 border-white"></div>
                <div className="absolute -top-1 left-10 w-3 h-3 bg-[#FFB6C1] rounded-[50%_50%_50%_0%] border-2 border-white"></div>
                {/* Eyes */}
                <div className="absolute top-2 left-6 w-1.5 h-1.5 bg-black rounded-full"></div>
                <div className="absolute top-2 left-9 w-1.5 h-1.5 bg-black rounded-full"></div>
                {/* Nose */}
                <div className="absolute top-4 left-7.5 w-1 h-1 bg-[#FFB6C1] rounded-full"></div>
                {/* Whiskers */}
                <div className="absolute top-3 left-2 w-4 h-0.5 bg-gray-400 opacity-50"></div>
                <div className="absolute top-3 right-2 w-4 h-0.5 bg-gray-400 opacity-50"></div>
                {/* Paws */}
                <div className="absolute bottom-0 left-2 w-3 h-3 bg-[#FFB6C1] rounded-full"></div>
                <div className="absolute bottom-0 right-4 w-3 h-3 bg-[#FFB6C1] rounded-full"></div>
              </div>
            </div>

            {/* Top Right Cat - Gray with stripes */}
            <div className="absolute top-32 right-8 z-5 opacity-85" style={{ animation: "float 4s ease-in-out infinite 0.5s" }}>
              <div className="relative w-28 h-20">
                {/* Cat body */}
                <div className="absolute bottom-0 right-0 w-24 h-14 bg-[#8B8B8B] rounded-[40%_60%_50%_50%/60%_60%_40%_40%] shadow-lg"></div>
                {/* Stripes */}
                <div className="absolute top-3 right-4 w-12 h-1 bg-[#5A5A5A] rounded-full opacity-70"></div>
                <div className="absolute top-5 right-5 w-10 h-1 bg-[#5A5A5A] rounded-full opacity-70"></div>
                <div className="absolute top-7 right-6 w-8 h-1 bg-[#5A5A5A] rounded-full opacity-70"></div>
                {/* Tail */}
                <div className="absolute top-0 left-0 w-3 h-14 bg-[#6B6B6B] rounded-full transform -rotate-30"></div>
                {/* Head */}
                <div className="absolute top-1 right-4 w-11 h-10 bg-[#8B8B8B] rounded-[50%_50%_40%_40%/60%_60%_50%_50%] shadow-md"></div>
                {/* White chest */}
                <div className="absolute bottom-2 right-8 w-8 h-6 bg-white rounded-[50%_50%_40%_40%]"></div>
                {/* Ears */}
                <div className="absolute -top-1 right-5 w-3 h-3 bg-[#FFB6C1] rounded-[50%_50%_0%_50%] border-2 border-[#8B8B8B]"></div>
                <div className="absolute -top-1 right-9 w-3 h-3 bg-[#FFB6C1] rounded-[50%_50%_50%_0%] border-2 border-[#8B8B8B]"></div>
                {/* Eyes */}
                <div className="absolute top-3 right-6 w-1.5 h-1.5 bg-black rounded-full"></div>
                <div className="absolute top-3 right-9 w-1.5 h-1.5 bg-black rounded-full"></div>
                {/* Nose */}
                <div className="absolute top-5 right-7.5 w-1 h-1 bg-[#FFB6C1] rounded-full"></div>
                {/* Paws */}
                <div className="absolute bottom-0 right-3 w-3 h-3 bg-white rounded-full"></div>
                <div className="absolute bottom-0 right-8 w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>

            {/* Bottom Right Cat - Orange tabby */}
            <div className="absolute bottom-6 right-10 z-5 opacity-90" style={{ animation: "float 3.5s ease-in-out infinite 1s" }}>
              <div className="relative w-26 h-18">
                {/* Cat body - lying on back */}
                <div className="absolute bottom-0 right-0 w-22 h-12 bg-[#FFE4B5] rounded-[50%_50%_50%_50%/60%_60%_40%_40%] shadow-lg"></div>
                {/* Orange patches */}
                <div className="absolute top-2 right-3 w-10 h-5 bg-[#FFA500] rounded-[60%_40%_50%_50%/50%_60%_40%_50%]"></div>
                <div className="absolute top-4 right-8 w-6 h-4 bg-[#FFA500] rounded-[50%_50%_40%_60%]"></div>
                {/* Tail with stripes */}
                <div className="absolute bottom-4 left-0 w-3 h-10 bg-[#FFA500] rounded-full"></div>
                <div className="absolute bottom-6 left-0 w-3 h-1 bg-[#FF8C00] rounded-full"></div>
                <div className="absolute bottom-9 left-0 w-3 h-1 bg-[#FF8C00] rounded-full"></div>
                {/* Head */}
                <div className="absolute top-0 right-6 w-10 h-9 bg-[#FFE4B5] rounded-[50%_50%_40%_40%/60%_60%_50%_50%] shadow-md"></div>
                {/* Orange head patch */}
                <div className="absolute top-0 right-7 w-7 h-5 bg-[#FFA500] rounded-[60%_40%_50%_50%]"></div>
                {/* Ears */}
                <div className="absolute -top-1 right-7 w-3 h-3 bg-[#FFB6C1] rounded-[50%_50%_0%_50%] border-2 border-[#FFE4B5]"></div>
                <div className="absolute -top-1 right-10 w-3 h-3 bg-[#FFB6C1] rounded-[50%_50%_50%_0%] border-2 border-[#FFE4B5]"></div>
                {/* Happy eyes */}
                <div className="absolute top-2 right-8 w-2 h-1 bg-black rounded-full transform rotate-12"></div>
                <div className="absolute top-2 right-11 w-2 h-1 bg-black rounded-full transform -rotate-12"></div>
                {/* Nose */}
                <div className="absolute top-4 right-9.5 w-1 h-1 bg-[#FFB6C1] rounded-full"></div>
                {/* Paws up in air */}
                <div className="absolute bottom-8 right-4 w-3 h-3 bg-[#FFB6C1] rounded-full"></div>
                <div className="absolute bottom-8 right-8 w-3 h-3 bg-[#FFB6C1] rounded-full"></div>
              </div>
            </div>

            {/* Floating hearts and leaves around cats */}
            <div className="absolute bottom-20 left-16 text-red-500 text-xl opacity-70" style={{ animation: "float 2s ease-in-out infinite 0.3s" }}>❤️</div>
            <div className="absolute bottom-36 left-12 text-purple-500 text-lg opacity-60" style={{ animation: "float 2.5s ease-in-out infinite 0.8s" }}>💜</div>
            <div className="absolute top-44 right-20 text-yellow-500 text-xl opacity-70" style={{ animation: "float 2.2s ease-in-out infinite 0.5s" }}>🧡</div>
            <div className="absolute top-52 right-28 text-green-600 text-base opacity-60" style={{ animation: "float 2.8s ease-in-out infinite 1.2s" }}>🍃</div>
            <div className="absolute bottom-28 right-24 text-green-500 text-lg opacity-65" style={{ animation: "float 2.4s ease-in-out infinite 0.6s" }}>🍃</div>
            <div className="absolute bottom-16 left-28 text-yellow-400 text-sm opacity-60" style={{ animation: "float 3s ease-in-out infinite 1.5s" }}>⭐</div>

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
                onClick={closeModal}
                className="bg-white/95 hover:bg-white text-gray-600 hover:text-gray-800 p-2.5 rounded-full shadow-xl backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:rotate-90"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="bg-[#f5f3f0] relative p-6 pt-2" style={{ zIndex: 10, borderBottomLeftRadius: "24px", borderBottomRightRadius: "24px" }}>
              <PostDetails
                image={image}
                onBack={() => setStep(1)}
                onShare={handleShare}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}