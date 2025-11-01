import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Travel Guide</h1>
      <p>Khám phá thế giới cùng chúng tôi!</p>
      <button onClick={() => navigate('/login')} style={{ margin: '0.5rem' }}>
        Đăng nhập
      </button>
      <button onClick={() => navigate('/register')} style={{ margin: '0.5rem' }}>
        Đăng ký
      </button>
    </div>
  );
}