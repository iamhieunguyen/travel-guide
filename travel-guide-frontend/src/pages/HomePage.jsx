// src/pages/HomePage.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, getIdToken, signOut } from '../services/cognito';

export default function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  // Giải mã username từ token (tùy chọn)
  const getUsername = () => {
    try {
      const token = getIdToken();
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload['cognito:username'] || 'User';
    } catch (e) {
      return 'User';
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Chào mừng, {getUsername()}!</h1>
      <p>Bạn đã đăng nhập thành công.</p>
      <div>
        <button onClick={() => alert('View Map')}>View Map</button>
        <button onClick={() => alert('User Settings')}>User Settings</button>
        <button onClick={() => alert('Create Post')}>Create Post</button>
        <button onClick={handleLogout} style={{ marginLeft: '1rem' }}>
          Đăng xuất
        </button>
      </div>
    </div>
  );
}