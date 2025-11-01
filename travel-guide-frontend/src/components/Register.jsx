import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/cognito';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault(); 
    setError(''); 
    try {
      await register(username, email, password);
      navigate('/confirm', { state: { username, email } });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h2>Đăng ký</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleRegister}>
        <div>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div style={{ margin: '0.5rem 0' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div style={{ margin: '0.5rem 0' }}>
          <input
            type="password"
            placeholder="Password (8+ ký tự, có số và chữ)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Đăng ký</button>
      </form>
    </div>
  );
}