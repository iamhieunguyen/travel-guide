import { useState, useRef } from "react";
import {
  register,
  confirmRegistration,
  resendConfirmationCode,
} from "../services/cognito";
import { useLanguage } from "../context/LanguageContext";

const TEXT = {
  vi: {
    title: 'Đăng ký',
    username: 'Tên đăng nhập',
    email: 'Email',
    password: 'Mật khẩu',
    confirmPassword: 'Xác nhận mật khẩu',
    registerButton: 'Đăng ký',
    processing: 'Đang xử lý...',
    otpTitle: 'Xác thực OTP',
    otpDescription: 'Nhập mã OTP đã gửi đến',
    verifying: 'Đang xác thực...',
    verify: 'Xác thực',
    changeEmail: '← Đổi Email',
    resendCode: 'Gửi lại mã',
    resendCooldown: 'Gửi lại ({0}s)',
    passwordMismatch: 'Mật khẩu và xác nhận mật khẩu không khớp',
    registrationFailed: 'Đăng ký thất bại',
    invalidOtp: 'Mã OTP không hợp lệ',
    otpSuccess: 'Xác thực OTP thành công! Đang chuyển đến trang đăng nhập...',
    enterFullOtp: 'Vui lòng nhập đầy đủ mã OTP 6 số',
    otpResent: 'Mã OTP mới đã được gửi!',
    resendFailed: 'Gửi lại mã OTP thất bại',
  },
  en: {
    title: 'Sign Up',
    username: 'Username',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    registerButton: 'Sign Up',
    processing: 'Processing...',
    otpTitle: 'Verify OTP',
    otpDescription: 'Enter the OTP sent to',
    verifying: 'Verifying...',
    verify: 'Verify',
    changeEmail: '← Change Email',
    resendCode: 'Resend Code',
    resendCooldown: 'Resend ({0}s)',
    passwordMismatch: 'Password and confirmation password do not match',
    registrationFailed: 'Registration failed',
    invalidOtp: 'Invalid OTP',
    otpSuccess: 'OTP verified successfully! Redirecting to login...',
    enterFullOtp: 'Please enter the full 6-digit OTP',
    otpResent: 'New OTP has been sent!',
    resendFailed: 'Failed to resend OTP',
  },
};

export default function Register({ embed = false, onSwitchToLogin}) {
  const { language } = useLanguage();
  const L = TEXT[language] || TEXT.vi;
  const [step, setStep] = useState("form");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // ✅ Handle registration
  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError(L.passwordMismatch);
      return;
    }

    try {
      setLoading(true);
      await register(username, email, password);
      setStep("otp");
      setCooldown(60);
      startCooldown();
    } catch (err) {
      setError(err.message || L.registrationFailed);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Confirm OTP and redirect to login
  const handleConfirm = async (e) => {
    e.preventDefault();
    const otpCode = otp.join("");
    setError("");
    setMessage("");

    if (otpCode.length !== 6) {
      setError(L.enterFullOtp);
      return;
    }

    try {
      setLoading(true);
      await confirmRegistration(username, otpCode);
      setMessage(L.otpSuccess);

      // ✅ Gọi callback sang AuthPage để tự lướt qua form Login
      setTimeout(() => {
        if (onSwitchToLogin) onSwitchToLogin();
      }, 500);
    } catch (err) {
      setError(err.message || L.invalidOtp);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Cooldown timer
  const startCooldown = () => {
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ✅ Resend OTP
  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      setLoading(true);
      await resendConfirmationCode(username);
      setCooldown(60);
      startCooldown();
      setMessage(L.otpResent);
    } catch (err) {
      setError(err.message || L.resendFailed);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle OTP input
  const handleOtpChange = (value, index) => {
    if (!/^[0-9]*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) otpRefs.current[index + 1].focus();
    if (!value && index > 0) otpRefs.current[index - 1].focus();
  };

  /* ✅ EMBED MODE UI */
  if (embed) {
    return (
      <>
        {/* REGISTER FORM */}
        {step === "form" && (
          <form
            onSubmit={handleRegister}
            className="space-y-5 w-full text-[#0891b2]"
          >
            <h2 className="text-2xl font-semibold text-[#06b6d4] text-center mb-2">
              {L.title}
            </h2>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}

            {/* Username */}
            <div className="relative mt-6">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder=" "
                autoComplete="off"
                className="peer w-full border border-[#06b6d4] rounded-2xl px-4 pt-6 pb-2
                  text-[#0891b2] bg-transparent outline-none focus:ring-2 focus:ring-[#06b6d4]/40 transition-all"
                required
              />
              <label
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#06b6d4] text-base bg-white px-1
                  transition-all duration-200 ease-in-out
                  peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:-translate-y-1/2
                  peer-focus:top-1 peer-focus:text-xs peer-focus:-translate-y-0 peer-focus:text-[#06b6d4]
                  peer-valid:top-1 peer-valid:text-xs peer-valid:-translate-y-0 peer-valid:text-[#06b6d4]"
              >
                {L.username}
              </label>
            </div>

            {/* Email */}
            <div className="relative mt-6">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                autoComplete="off"
                className="peer w-full border border-[#06b6d4] rounded-2xl px-4 pt-6 pb-2
                  text-[#0891b2] bg-transparent outline-none focus:ring-2 focus:ring-[#06b6d4]/40 transition-all"
                required
              />
              <label
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#06b6d4] text-base bg-white px-1
                  transition-all duration-200 ease-in-out
                  peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:-translate-y-1/2
                  peer-focus:top-1 peer-focus:text-xs peer-focus:-translate-y-0 peer-focus:text-[#06b6d4]
                  peer-valid:top-1 peer-valid:text-xs peer-valid:-translate-y-0 peer-valid:text-[#06b6d4]"
              >
                {L.email}
              </label>
            </div>

            {/* Password */}
            <div className="relative mt-6">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                autoComplete="new-password"
                className="peer w-full border border-[#06b6d4] rounded-2xl px-4 pt-6 pb-2
                  text-[#0891b2] bg-transparent outline-none focus:ring-2 focus:ring-[#06b6d4]/40 transition-all"
                required
              />
              <label
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#06b6d4] text-base bg-white px-1
                  transition-all duration-200 ease-in-out
                  peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:-translate-y-1/2
                  peer-focus:top-1 peer-focus:text-xs peer-focus:-translate-y-0 peer-focus:text-[#06b6d4]
                  peer-valid:top-1 peer-valid:text-xs peer-valid:-translate-y-0 peer-valid:text-[#06b6d4]"
              >
                {L.password}
              </label>
            </div>

            {/* Confirm Password */}
            <div className="relative mt-6">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder=" "
                autoComplete="new-password"
                className="peer w-full border border-[#06b6d4] rounded-2xl px-4 pt-6 pb-2
                  text-[#0891b2] bg-transparent outline-none focus:ring-2 focus:ring-[#06b6d4]/40 transition-all"
                required
              />
              <label
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#06b6d4] text-base bg-white px-1
                  transition-all duration-200 ease-in-out
                  peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:-translate-y-1/2
                  peer-focus:top-1 peer-focus:text-xs peer-focus:-translate-y-0 peer-focus:text-[#06b6d4]
                  peer-valid:top-1 peer-valid:text-xs peer-valid:-translate-y-0 peer-valid:text-[#06b6d4]"
              >
                {L.confirmPassword}
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#0891b2] to-[#06b6d4] hover:from-[#0e7490] hover:to-[#0891b2] text-white font-medium py-3 rounded-2xl
                transition-all duration-300 shadow-md hover:shadow-xl hover:scale-[1.02] mt-6"
            >
              {loading ? L.processing : L.registerButton}
            </button>
          </form>
        )}

        {/* OTP PAGE */}
        {step === "otp" && (
          <form
            onSubmit={handleConfirm}
            className="space-y-5 w-full text-center text-[#0891b2]"
          >
            <h2 className="text-2xl font-semibold text-[#06b6d4] text-center mb-2">
              {L.otpTitle}
            </h2>
            <p className="text-gray-600 text-sm">
              {L.otpDescription} <b>{email}</b>
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm border border-green-200">
                {message}
              </div>
            )}

            <div className="flex justify-between gap-2 mt-4">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  value={digit}
                  onChange={(e) => handleOtpChange(e.target.value, i)}
                  maxLength="1"
                  ref={(el) => (otpRefs.current[i] = el)}
                  className="w-12 h-12 text-center border border-[#06b6d4] rounded-xl text-lg font-bold 
                    text-[#0891b2] focus:ring-2 focus:ring-[#06b6d4]/40 focus:border-[#06b6d4] outline-none"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#0891b2] to-[#06b6d4] hover:from-[#0e7490] hover:to-[#0891b2] text-white font-medium py-3 rounded-2xl
                transition-all duration-300 shadow-md hover:shadow-xl hover:scale-[1.02] mt-4"
            >
              {loading ? L.verifying : L.verify}
            </button>

            <div className="flex justify-between text-sm mt-4">
              <button
                onClick={() => setStep("form")}
                type="button"
                className="text-gray-500 hover:text-gray-800"
              >
                {L.changeEmail}
              </button>

              <button
                onClick={handleResend}
                type="button"
                disabled={cooldown > 0}
                className={`font-medium ${cooldown > 0
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-[#06b6d4] hover:text-[#0891b2]"
                  }`}
              >
                {cooldown > 0 ? L.resendCooldown.replace('{0}', cooldown) : L.resendCode}
              </button>
            </div>
          </form>
        )}
      </>
    );
  }

  return null;
}
