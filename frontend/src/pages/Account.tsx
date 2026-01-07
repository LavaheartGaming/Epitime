import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  User,
  Lock,
  ShieldCheck,
  Trash2,
  Eye,
  EyeOff,
  Save,
  LogOut,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  const [open, setOpen] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(!!user?.two_factor_enabled);
  const [otpSecret, setOtpSecret] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const [profile, setProfile] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone_number: user?.phone_number || "",
  });
  const [passwordData, setPasswordData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  const fetchWithAuth = async (url: string, method = "GET", body?: any) => {
    const token = localStorage.getItem("access_token");
    const headers: any = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    const options: any = { method, headers };
    if (body) options.body = JSON.stringify(body);
    return fetch(url, options);
  };

  const handleProfileUpdate = async () => {
    const res = await fetchWithAuth(`${API_URL}/api/users/update/`, "PUT", profile);
    const data = await res.json();
    setMessage(res.ok ? "✅ Profile updated successfully!" : data.error || "❌ Update failed.");
  };

  const handleChangePassword = async () => {
    const res = await fetchWithAuth(`${API_URL}/api/users/change-password/`, "PUT", passwordData);
    const data = await res.json();
    setMessage(res.ok ? "✅ Password changed!" : data.error || "❌ Error changing password.");
  };

  const handleEnable2FA = async () => {
    const res = await fetchWithAuth(`${API_URL}/api/users/enable-2fa/`, "POST");
    const data = await res.json();
    if (res.ok) {
      setOtpSecret(data.otp_secret);
      setMessage("✅ 2FA setup initiated. Enter your code below.");
    } else setMessage(data.error || "❌ Failed to initiate 2FA.");
  };

  const handleVerify2FA = async () => {
    const res = await fetchWithAuth(`${API_URL}/api/users/verify-2fa/`, "POST", { code: otpCode });
    const data = await res.json();
    if (res.ok) {
      setTwoFAEnabled(true);
      setMessage("✅ 2FA activated successfully!");
    } else setMessage(data.error || "❌ Invalid 2FA code.");
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("⚠️ Are you sure you want to delete your account?")) return;
    const res = await fetchWithAuth(`${API_URL}/api/users/delete/`, "DELETE");
    if (res.ok) {
      alert("✅ Account deleted successfully.");
      logout();
      navigate("/login");
    } else setMessage("❌ Failed to delete account.");
  };

  const toggle = (section: string) => setOpen(open === section ? null : section);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-900 text-white py-12 px-6">
      <style>
        {`
          .accordion-content {
            max-height: 0;
            opacity: 0;
            overflow: hidden;
            transition: all 0.4s ease-in-out;
          }
          .accordion-content.open {
            max-height: 1000px;
            opacity: 1;
            padding-top: 1rem;
            padding-bottom: 1rem;
          }
        `}
      </style>

      <div className="max-w-2xl mx-auto bg-blue-950/60 p-8 rounded-2xl shadow-2xl border border-blue-700/40 backdrop-blur-xl">
        <div className="text-center mb-8">
          <img
            src="https://cdn-icons-png.flaticon.com/512/2103/2103691.png"
            alt="Epitime"
            className="w-20 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-yellow-400 mb-2">
            Hello, {user?.full_name} 👋
          </h1>
          <p className="text-sm text-gray-300">{user?.email}</p>
        </div>

        {message && (
          <div className="bg-blue-800 border border-yellow-400 text-center py-3 mb-6 rounded-xl font-semibold">
            {message}
          </div>
        )}

        {/* === CARD: Profil === */}
        <div className="mb-4">
          <button
            onClick={() => toggle("profile")}
            className="w-full flex justify-between items-center bg-blue-800/40 hover:bg-blue-700/40 rounded-xl px-5 py-3 transition-all"
          >
            <div className="flex items-center gap-3">
              <User className="text-yellow-400" />
              <span className="font-semibold">Profile Information</span>
            </div>
            {open === "profile" ? <ChevronUp /> : <ChevronDown />}
          </button>

          <div className={`accordion-content ${open === "profile" ? "open" : ""}`}>
            <div className="bg-blue-900/60 border-t border-blue-700 rounded-b-xl p-5 space-y-3">
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="Full name"
                className="w-full bg-blue-900/50 border border-blue-700 rounded-lg p-3"
              />
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="Email"
                className="w-full bg-blue-900/50 border border-blue-700 rounded-lg p-3"
              />
              <input
                type="tel"
                value={profile.phone_number}
                onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                placeholder="Phone number"
                className="w-full bg-blue-900/50 border border-blue-700 rounded-lg p-3"
              />
              <button
                onClick={handleProfileUpdate}
                className="bg-yellow-400 text-gray-900 py-2 px-5 rounded-lg font-semibold hover:bg-yellow-300 flex items-center gap-2"
              >
                <Save size={18} /> Save
              </button>
            </div>
          </div>
        </div>

        {/* === CARD: Password === */}
        <div className="mb-4">
          <button
            onClick={() => toggle("password")}
            className="w-full flex justify-between items-center bg-blue-800/40 hover:bg-blue-700/40 rounded-xl px-5 py-3 transition-all"
          >
            <div className="flex items-center gap-3">
              <Lock className="text-yellow-400" />
              <span className="font-semibold">Change Password</span>
            </div>
            {open === "password" ? <ChevronUp /> : <ChevronDown />}
          </button>

          <div className={`accordion-content ${open === "password" ? "open" : ""}`}>
            <div className="bg-blue-900/60 border-t border-blue-700 rounded-b-xl p-5 space-y-3">
              {["old_password", "new_password", "confirm_password"].map((f, i) => (
                <input
                  key={i}
                  type={showPassword ? "text" : "password"}
                  placeholder={
                    f === "old_password"
                      ? "Old password"
                      : f === "new_password"
                      ? "New password"
                      : "Confirm password"
                  }
                  value={(passwordData as any)[f]}
                  onChange={(e) => setPasswordData({ ...passwordData, [f]: e.target.value })}
                  className="w-full bg-blue-900/50 border border-blue-700 rounded-lg p-3"
                />
              ))}

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-yellow-400 text-sm hover:underline flex items-center gap-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />} Toggle visibility
              </button>

              <button
                onClick={handleChangePassword}
                className="bg-yellow-400 text-gray-900 py-2 px-5 rounded-lg font-semibold hover:bg-yellow-300 flex items-center gap-2"
              >
                <Lock size={18} /> Update
              </button>
            </div>
          </div>
        </div>

        {/* === CARD: 2FA === */}
        <div className="mb-4">
          <button
            onClick={() => toggle("2fa")}
            className="w-full flex justify-between items-center bg-blue-800/40 hover:bg-blue-700/40 rounded-xl px-5 py-3 transition-all"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-yellow-400" />
              <span className="font-semibold">Security & 2FA</span>
            </div>
            {open === "2fa" ? <ChevronUp /> : <ChevronDown />}
          </button>

          <div className={`accordion-content ${open === "2fa" ? "open" : ""}`}>
            <div className="bg-blue-900/60 border-t border-blue-700 rounded-b-xl p-5 space-y-3">
              {twoFAEnabled ? (
                <p className="text-green-400 font-semibold">✅ 2FA enabled.</p>
              ) : !otpSecret ? (
                <button
                  onClick={handleEnable2FA}
                  className="bg-yellow-400 text-gray-900 py-2 px-5 rounded-lg font-semibold hover:bg-yellow-300"
                >
                  Enable 2FA
                </button>
              ) : (
                <>
                  <p>Enter the 6-digit code from your authenticator app:</p>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full bg-blue-900/50 border border-blue-700 rounded-lg p-3"
                  />
                  <button
                    onClick={handleVerify2FA}
                    className="bg-yellow-400 text-gray-900 py-2 px-5 rounded-lg font-semibold hover:bg-yellow-300"
                  >
                    Verify Code
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* === CARD: Danger Zone === */}
        <div>
          <button
            onClick={() => toggle("danger")}
            className="w-full flex justify-between items-center bg-blue-800/40 hover:bg-red-700/40 rounded-xl px-5 py-3 transition-all"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="text-red-400" />
              <span className="font-semibold">Danger Zone</span>
            </div>
            {open === "danger" ? <ChevronUp /> : <ChevronDown />}
          </button>

          <div className={`accordion-content ${open === "danger" ? "open" : ""}`}>
            <div className="bg-blue-900/60 border-t border-red-700 rounded-b-xl p-5 space-y-3">
              <p>⚠️ This action is irreversible. All your data will be deleted.</p>
              <button
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-500 text-white py-2 px-5 rounded-lg font-semibold"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center">
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="bg-yellow-400 text-gray-900 py-2 px-5 rounded-lg font-semibold hover:bg-yellow-300 flex items-center justify-center mx-auto gap-2"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}
