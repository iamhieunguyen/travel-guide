// src/pages/Register.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, confirmRegistration, resendConfirmationCode } from '../services/cognito';

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState('form');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await register(username, email, password);
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await confirmRegistration(username, otp);
      navigate('/login'); // ✅ không alert
    } catch (err) {
      setError(err.message || 'Mã không hợp lệ');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await resendConfirmationCode(username);
      // Có thể dùng toast sau này, hiện tại im lặng hoặc dùng state
    } catch (err) {
      setError('Gửi lại mã thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'form') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">Tạo tài khoản</h2>
            <p className="text-gray-500">Khám phá thế giới cùng Travel Guide</p>
          </div>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded-md text-sm">{error}</div>}
          <form onSubmit={handleRegister} className="space-y-4">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tên người dùng"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-75"
            >
              {loading ? 'Đang xử lý...' : 'Đăng ký'}
            </button>
          </form>
          <div className="text-center text-sm text-gray-600">
            Đã có tài khoản?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-indigo-600 hover:underline"
            >
              Đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Xác minh email</h2>
          <p className="text-gray-500">Chúng tôi đã gửi mã OTP đến <span className="font-medium">{email}</span></p>
        </div>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded-md text-sm">{error}</div>}
        <form onSubmit={handleConfirm} className="space-y-4">
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Nhập mã OTP"
            maxLength={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-center text-xl letter-spacing-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-75"
          >
            {loading ? 'Đang xác minh...' : 'Xác minh'}
          </button>
        </form>
        <div className="flex justify-between items-center">
          <button
            onClick={() => setStep('form')}
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            ← Quay lại
          </button>
          <button
            onClick={handleResend}
            disabled={loading}
            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm disabled:opacity-75"
          >
            Gửi lại mã
          </button>
        </div>
      </div>
    </div>
  );
}