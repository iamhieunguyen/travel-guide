// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/cognito';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/home'); // Chuyển thẳng, không alert
    } catch (err) {
      setError(err.message || 'Tên đăng nhập hoặc mật khẩu không đúng');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">Chào mừng trở lại!</h1>
          <p className="text-gray-500 mt-2">Đăng nhập để tiếp tục hành trình khám phá</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">Tên người dùng</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition shadow-md hover:shadow-lg"
          >
            Đăng nhập
          </button>
        </form>

        <div className="text-center text-sm text-gray-600">
          Chưa có tài khoản?{' '}
          <button
            onClick={() => navigate('/register')}
            className="text-indigo-600 font-medium hover:underline"
          >
            Đăng ký ngay
          </button>
        </div>
      </div>
    </div>
  );
}