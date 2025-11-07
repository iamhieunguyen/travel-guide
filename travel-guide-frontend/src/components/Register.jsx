import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  register,
  confirmRegistration,
  resendConfirmationCode,
} from "../services/cognito";

export default function Register({ embed = false, onSwitchToLogin}) {
  const navigate = useNavigate();
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
      setError("Password and confirmation password do not match");
      return;
    }

    try {
      setLoading(true);
      await register(username, email, password);
      setStep("otp");
      setCooldown(60);
      startCooldown();
    } catch (err) {
      setError(err.message || "Registration failed");
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
      setError("Please enter the full 6-digit OTP");
      return;
    }

    try {
      setLoading(true);
      await confirmRegistration(username, otpCode);
      setMessage("OTP verified successfully! Redirecting to login...");

      // ✅ Gọi callback sang AuthPage để tự lướt qua form Login
      setTimeout(() => {
        if (onSwitchToLogin) onSwitchToLogin();
      }, 500);
    } catch (err) {
      setError(err.message || "Invalid OTP");
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
      setMessage("New OTP has been sent!");
    } catch (err) {
      setError(err.message || "Failed to resend OTP");
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
            className="space-y-5 w-full text-[#5c704d]"
          >
            <h2 className="text-2xl font-semibold text-[#7a8c5d] text-center mb-2">
              Register
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
                className="peer w-full border border-[#9caf84] rounded-2xl px-4 pt-6 pb-2
                  text-[#5c704d] bg-transparent outline-none focus:ring-2 focus:ring-[#9caf84]/40 transition-all"
                required
              />
              <label
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9caf84] text-base bg-white px-1
                  transition-all duration-200 ease-in-out
                  peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:-translate-y-1/2
                  peer-focus:top-1 peer-focus:text-xs peer-focus:-translate-y-0 peer-focus:text-[#5c704d]
                  peer-valid:top-1 peer-valid:text-xs peer-valid:-translate-y-0 peer-valid:text-[#5c704d]"
              >
                Username
              </label>
            </div>

            {/* Email */}
            <div className="relative mt-6">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                className="peer w-full border border-[#9caf84] rounded-2xl px-4 pt-6 pb-2
                  text-[#5c704d] bg-transparent outline-none focus:ring-2 focus:ring-[#9caf84]/40 transition-all"
                required
              />
              <label
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9caf84] text-base bg-white px-1
                  transition-all duration-200 ease-in-out
                  peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:-translate-y-1/2
                  peer-focus:top-1 peer-focus:text-xs peer-focus:-translate-y-0 peer-focus:text-[#5c704d]
                  peer-valid:top-1 peer-valid:text-xs peer-valid:-translate-y-0 peer-valid:text-[#5c704d]"
              >
                Email
              </label>
            </div>

            {/* Password */}
            <div className="relative mt-6">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                className="peer w-full border border-[#9caf84] rounded-2xl px-4 pt-6 pb-2
                  text-[#5c704d] bg-transparent outline-none focus:ring-2 focus:ring-[#9caf84]/40 transition-all"
                required
              />
              <label
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9caf84] text-base bg-white px-1
                  transition-all duration-200 ease-in-out
                  peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:-translate-y-1/2
                  peer-focus:top-1 peer-focus:text-xs peer-focus:-translate-y-0 peer-focus:text-[#5c704d]
                  peer-valid:top-1 peer-valid:text-xs peer-valid:-translate-y-0 peer-valid:text-[#5c704d]"
              >
                Password
              </label>
            </div>

            {/* Confirm Password */}
            <div className="relative mt-6">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder=" "
                className="peer w-full border border-[#9caf84] rounded-2xl px-4 pt-6 pb-2
                  text-[#5c704d] bg-transparent outline-none focus:ring-2 focus:ring-[#9caf84]/40 transition-all"
                required
              />
              <label
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9caf84] text-base bg-white px-1
                  transition-all duration-200 ease-in-out
                  peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:-translate-y-1/2
                  peer-focus:top-1 peer-focus:text-xs peer-focus:-translate-y-0 peer-focus:text-[#5c704d]
                  peer-valid:top-1 peer-valid:text-xs peer-valid:-translate-y-0 peer-valid:text-[#5c704d]"
              >
                Confirm Password
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#9caf84] hover:bg-[#86a06e] text-white font-medium py-3 rounded-2xl
                transition-all duration-300 shadow-md hover:shadow-lg mt-6"
            >
              {loading ? "Processing..." : "Register"}
            </button>
          </form>
        )}

        {/* OTP PAGE */}
        {step === "otp" && (
          <form
            onSubmit={handleConfirm}
            className="space-y-5 w-full text-center text-[#5c704d]"
          >
            <h2 className="text-2xl font-semibold text-[#7a8c5d] text-center mb-2">
              OTP Verification
            </h2>
            <p className="text-gray-600 text-sm">
              Enter the OTP sent to <b>{email}</b>
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
                  className="w-12 h-12 text-center border border-[#9caf84] rounded-xl text-lg font-bold 
                    text-[#5c704d] focus:ring-2 focus:ring-[#9caf84]/40 focus:border-[#9caf84] outline-none"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#9caf84] hover:bg-[#86a06e] text-white font-medium py-3 rounded-2xl
                transition-all duration-300 shadow-md hover:shadow-lg mt-4"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>

            <div className="flex justify-between text-sm mt-4">
              <button
                onClick={() => setStep("form")}
                type="button"
                className="text-gray-500 hover:text-gray-800"
              >
                ← Change Email
              </button>

              <button
                onClick={handleResend}
                type="button"
                disabled={cooldown > 0}
                className={`font-medium ${cooldown > 0
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-[#9caf84] hover:text-[#86a06e]"
                  }`}
              >
                {cooldown > 0 ? `Resend (${cooldown}s)` : "Resend Code"}
              </button>
            </div>
          </form>
        )}
      </>
    );
  }

  return null;
}
