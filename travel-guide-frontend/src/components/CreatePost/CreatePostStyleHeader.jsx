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
      height: "20px", 
      borderTopLeftRadius: "24px", 
      borderTopRightRadius: "24px"
    }}>
    </div>
  );
}
