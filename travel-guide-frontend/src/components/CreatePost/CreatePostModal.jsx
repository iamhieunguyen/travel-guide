// components/CreatePost/CreatePostModal.jsx
import { useState } from "react";
import { useCreatePostModal } from "../../context/CreatePostModalContext";
import ImageSelector from "./ImageSelector/ImageSelector";
import PostDetails from "./PostDetails/PostDetails";
import LocationSelector from "./LocationSelector/LocationSelector";
import CreatePostStyleHeader from "./CreatePostStyleHeader";
import { X } from "lucide-react";

export default function CreatePostModal() {
  const { isOpen, closeModal, step, setStep, image, handleShare } = useCreatePostModal();
  const [locationData, setLocationData] = useState(null);

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

            <CreatePostStyleHeader />

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
                locationData={locationData}
                onBack={() => setStep(1)}
                onAddLocation={() => setStep(3)}
                onLocationSelect={(data) => setLocationData(data)}
                onShare={handleShare}
              />
            </div>
          </div>
        </div>
      )}
      
      {step === 3 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white shadow-2xl w-full max-w-[1200px] h-[90vh] flex flex-col relative animate-fadeIn rounded-3xl overflow-hidden">
            <div className="absolute top-3 left-3 z-40">
              <button
                onClick={closeModal}
                className="bg-white/95 hover:bg-white text-gray-600 hover:text-gray-800 p-2.5 rounded-full shadow-xl backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:rotate-90"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <LocationSelector
              onBack={() => setStep(2)}
              onNext={(data) => {
                setLocationData(data);
                setStep(2);
              }}
              initialLocation={locationData?.position}
              initialSearch={locationData?.locationName}
            />
          </div>
        </div>
      )}
    </>
  );
}