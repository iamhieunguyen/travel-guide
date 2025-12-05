// components/CreatePost/CreatePostModal.jsx
import { useState, useEffect } from "react";
import { useCreatePostModal } from "../../contexts/CreatePostModalContext";
import ImageSelector from "./ImageSelector";
import PostDetails from "./PostDetails/PostDetails";
import LocationSelector from "./LocationSelector";
import CreatePostStyleHeader from "./CreatePostStyleHeader";
import { X } from "lucide-react";

export default function CreatePostModal() {
  const { isOpen, closeModal, step, setStep, image, handleShare, editMode, editPostData, caption, setCaption, privacy, setPrivacy } = useCreatePostModal();
  const [locationData, setLocationData] = useState(null);
  
  // Local state để backup caption và privacy khi chuyển step
  const [captionBackup, setCaptionBackup] = useState("");
  const [privacyBackup, setPrivacyBackup] = useState("public");

  // Update location khi editPostData thay đổi
  useEffect(() => {
    if (editMode && editPostData && editPostData.lat && editPostData.lng) {
      // Nếu có location name sẵn, dùng luôn
      if (editPostData.location?.name) {
        setLocationData({
          position: { lat: editPostData.lat, lng: editPostData.lng },
          locationName: editPostData.location.name
        });
      } else {
        // Nếu không có, fetch từ Nominatim
        const fetchLocationName = async () => {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${editPostData.lat}&lon=${editPostData.lng}&format=json&addressdetails=1`,
              { headers: { 'Accept-Language': 'vi' } }
            );
            const data = await response.json();
            const locationName = data.display_name || `${editPostData.lat}, ${editPostData.lng}`;
            setLocationData({
              position: { lat: editPostData.lat, lng: editPostData.lng },
              locationName: locationName
            });
          } catch (error) {
            console.error('Error fetching location name:', error);
            setLocationData({
              position: { lat: editPostData.lat, lng: editPostData.lng },
              locationName: `${editPostData.lat}, ${editPostData.lng}`
            });
          }
        };
        fetchLocationName();
      }
    }
  }, [editMode, editPostData]);

  if (!isOpen) return null;

  return (
    <>
      {step === 1 && <ImageSelector onNext={() => setStep(2)} />}
      {step === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div className="bg-white shadow-2xl w-full max-w-[1100px] flex flex-col relative animate-fadeIn rounded-3xl overflow-hidden">
            <CreatePostStyleHeader />

            <div className="absolute top-4 left-4 z-40">
              <button
                onClick={closeModal}
                className="bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 p-2.5 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="bg-white relative p-6 pt-2" style={{ zIndex: 10 }}>
              <PostDetails
                image={image}
                locationData={locationData}
                onBack={() => setStep(1)}
                onAddLocation={() => {
                  console.log('💾 Backing up caption:', caption);
                  console.log('💾 Backing up privacy:', privacy);
                  // Backup caption và privacy trước khi chuyển step
                  setCaptionBackup(caption);
                  setPrivacyBackup(privacy);
                  setStep(3);
                }}
                onLocationSelect={(data) => setLocationData(data)}
                onShare={handleShare}
              />
            </div>
          </div>
        </div>
      )}
      
      {step === 3 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div className="bg-white shadow-2xl w-full max-w-[1100px] h-[90vh] flex flex-col relative animate-fadeIn rounded-3xl overflow-hidden">
            <div className="absolute top-4 left-4 z-40">
              <button
                onClick={closeModal}
                className="bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 p-2.5 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <LocationSelector
              onBack={() => {
                console.log('🔙 Restoring caption:', captionBackup);
                console.log('🔙 Restoring privacy:', privacyBackup);
                // Restore caption và privacy khi quay lại
                if (captionBackup) setCaption(captionBackup);
                if (privacyBackup) setPrivacy(privacyBackup);
                setStep(2);
              }}
              onNext={(data) => {
                console.log('➡️ Restoring caption:', captionBackup);
                console.log('➡️ Restoring privacy:', privacyBackup);
                setLocationData(data);
                // Restore caption và privacy khi chọn location xong
                if (captionBackup) setCaption(captionBackup);
                if (privacyBackup) setPrivacy(privacyBackup);
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