import { useState, useEffect } from "react";
import { getCurrentUser } from "../../services/cognito";

export default function CreatePostStyleHeader() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const username = user?.username || "traveler";
  const userInitial = username.charAt(0).toUpperCase();

  return (
    <div className="relative bg-[#f5f3f0] overflow-visible" style={{ 
      height: "80px", 
      borderTopLeftRadius: "24px", 
      borderTopRightRadius: "24px"
    }}>
      {/* Username/Handle - Near Avatar */}
      <div className="absolute top-[-40px] left-1/2 transform -translate-x-1/2 translate-x-[80px] z-25">
        <div className="bg-[#c75b7a] text-white px-6 py-2.5 rounded-full font-semibold text-xs shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          @{username.toUpperCase()}
        </div>
      </div>

      {/* Center Avatar with Animated Ring - On top edge */}
      <div className="absolute left-1/2 transform -translate-x-1/2 z-30" style={{ top: "-50px" }}>
        <div className="relative">
          {/* Animated Ring - Top Arc (Pink) */}
          <svg className="absolute -inset-5 w-36 h-36" style={{ animation: "spin 4s linear infinite" }}>
            <circle
              cx="72"
              cy="72"
              r="66"
              fill="none"
              stroke="#c75b7a"
              strokeWidth="5"
              strokeDasharray="100 314"
              strokeLinecap="round"
            />
          </svg>
          
          {/* Animated Ring - Bottom Arc (Green) */}
          <svg className="absolute -inset-5 w-36 h-36" style={{ animation: "spin-reverse 4s linear infinite" }}>
            <circle
              cx="72"
              cy="72"
              r="66"
              fill="none"
              stroke="#b8c89f"
              strokeWidth="5"
              strokeDasharray="100 314"
              strokeLinecap="round"
              transform="rotate(180 72 72)"
            />
          </svg>
          
          {/* White Border with Shadow */}
          <div className="relative w-28 h-28 rounded-full bg-white p-1.5 shadow-2xl">
            {/* Avatar Circle */}
            <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-pink-300 via-pink-400 to-red-400 flex items-center justify-center ring-2 ring-white">
              {user?.picture ? (
                <img 
                  src={user.picture} 
                  alt="avatar" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-3xl font-bold drop-shadow-lg">{userInitial}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes blob1 {
          0%, 100% { 
            border-radius: 45% 55% 65% 35% / 55% 40% 60% 45%;
            transform: translate(0, 0) scale(1);
          }
          50% { 
            border-radius: 55% 45% 35% 65% / 45% 60% 40% 55%;
            transform: translate(10px, -10px) scale(1.05);
          }
        }
        @keyframes blob2 {
          0%, 100% { 
            border-radius: 55% 45% 40% 60% / 45% 55% 65% 35%;
            transform: translate(0, 0) scale(1);
          }
          50% { 
            border-radius: 45% 55% 60% 40% / 55% 45% 35% 65%;
            transform: translate(-10px, 10px) scale(1.05);
          }
        }
        @keyframes blob3 {
          0%, 100% { 
            border-radius: 48% 52% 58% 42% / 55% 48% 52% 45%;
            transform: translate(0, 0) scale(1);
          }
          50% { 
            border-radius: 52% 48% 42% 58% / 45% 52% 48% 55%;
            transform: translate(5px, 5px) scale(1.08);
          }tra
        }
      `}</style>
    </div>
  );
}
