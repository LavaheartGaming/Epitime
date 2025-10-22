import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  User,
  Phone,
  Mail,
  Lock,
  Trash2,
  ShieldCheck,
  Eye,
  EyeOff,
  Save,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  // === États principaux ===
  const [profile, setProfile] = useState({
    username: user?.username || "",
    email: user?.email || "",
    phone_number: user?.phone_number || "",
  });

  const [passwordData, setPasswordData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [twoFAEnabled, setTwoFAEnabled] = useState<boolean>(
    !!user?.two_factor_enabled
  );
  const [otpSecret, setOtpSecret] = useState<string>("");
  const [otpCode, setOtpCode] = useState<string>("");

  // === 🔁 Requêtes authentifiées ===
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

  // === ⏳ Chargement du profil ===
  useEffect(() => {
    if (user) {
      setProfile({
        username: user.username || "",
        email: user.email || "",
        phone_number: user.phone_number || "",
      });
      setTwoFAEnabled(!!user.two_factor_enabled);
    }
  }, [user]);

  // === 🧾 Mise à jour du profil ===
  const handleProfileUpdate = async () => {
    try {
      const res = await fetchWithAuth(
        `${API_URL}/api/users/update/`,
        "PUT",
        profile
      );
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Profile updated successfully!");
      } else {
        setMessage(data.error || "❌ Failed to update profile.");
      }
    } catch {
      setMessage("⚠️ Server unreachable.");
    }
  };

  // === 🔑 Changement de mot de passe ===
  const handleChangePassword = async () => {
    try {
      const res = await fetchWithAuth(
        `${API_URL}/api/users/change-password/`,
        "PUT",
        passwordData
      );
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Password changed successfully!");
        setPasswordData({
          old_password: "",
          new_password: "",
          confirm_password: "",
        });
      } else {
        setMessage(data.error || "❌ Password change failed.");
      }
    } catch {
      setMessage("⚠️ Server unreachable.");
    }
  };

  // === ❌ Suppression du compte ===
  const handleDeleteAccount = async () => {
    if (!window.confirm("⚠️ Are you sure you want to delete your account?"))
      return;
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/delete/`, "DELETE");
      if (res.ok) {
        alert("✅ Account deleted successfully.");
        logout();
        navigate("/login");
      } else {
        setMessage("❌ Failed to delete account.");
      }
    } catch {
      setMessage("⚠️ Server unreachable.");
    }
  };

  // === 🔐 Activation de la double authentification ===
  const handleEnable2FA = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/enable-2fa/`, "POST");
      const data = await res.json();
      if (res.ok) {
        setOtpSecret(data.otp_secret);
        setMessage("✅ 2FA setup initiated. Enter your code below.");
      } else {
        setMessage(data.error || "❌ Failed to initiate 2FA.");
      }
    } catch {
      setMessage("⚠️ Server unreachable.");
    }
  };

  // === ✅ Vérification du code 2FA ===
  const handleVerify2FA = async () => {
    try {
      const res = await fetchWithAuth(
        `${API_URL}/api/users/verify-2fa/`,
        "POST",
        { code: otpCode }
      );
      const data = await res.json();
      if (res.ok) {
        setTwoFAEnabled(true);
        setMessage("✅ 2FA activated successfully!");
      } else {
        setMessage(data.error || "❌ Invalid 2FA code.");
      }
    } catch {
      setMessage("⚠️ Server unreachable.");
    }
  };

  // === 🎨 Interface ===
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-900 text-white py-12 px-6">
      <div className="max-w-2xl mx-auto bg-blue-950/60 p-8 rounded-2xl shadow-2xl border border-blue-700/40 backdrop-blur-xl">
        <div className="text-center mb-8">
          <img
            src="https://cdn-icons-png.flaticon.com/512/2103/2103691.png"
            alt="Epitime"
            className="w-20 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-yellow-400 mb-2">
            Hello, {user?.username} 👋
          </h1>
          <p className="text-sm text-gray-300">{user?.email}</p>
        </div>

        {message && (
          <div className="bg-blue-800 border border-yellow-400 text-center py-3 mb-6 rounded-xl font-semibold">
            {message}
          </div>
        )}

        {/* === Profil === */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-yellow-400 flex items-center gap-2">
            <User /> Profile Information
          </h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Username"
              value={profile.username}
              onChange={(e) =>
                setProfile({ ...profile, username: e.target.value })
              }
              className="w-full bg-blue-900/50 border border-blue-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-400"
            />
            <input
              type="email"
              placeholder="Email"
              value={profile.email}
              onChange={(e) =>
                setProfile({ ...profile, email: e.target.value })
              }
              className="w-full bg-blue-900/50 border border-blue-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-400"
            />
            <input
              type="tel"
              placeholder="Phone number"
              value={profile.phone_number}
              onChange={(e) =>
                setProfile({ ...profile, phone_number: e.target.value })
              }
              className="w-full bg-blue-900/50 border border-blue-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-400"
            />
            <button
              onClick={handleProfileUpdate}
              className="bg-yellow-400 text-gray-900 py-2 px-5 rounded-lg font-semibold hover:bg-yellow-300 transition-all flex items-center gap-2"
            >
              <Save size={18} /> Save Changes
            </button>
          </div>
        </section>

        {/* === Mot de passe === */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-yellow-400 flex items-center gap-2">
            <Lock /> Change Password
          </h2>
          <div className="space-y-3">
            {["old_password", "new_password", "confirm_password"].map(
              (field, i) => (
                <input
                  key={i}
                  type={showPassword ? "text" : "password"}
                  placeholder={
                    field === "old_password"
                      ? "Old password"
                      : field === "new_password"
                      ? "New password"
                      : "Confirm password"
                  }
                  value={(passwordData as any)[field]}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      [field]: e.target.value,
                    })
                  }
                  className="w-full bg-blue-900/50 border border-blue-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-400"
                />
              )
            )}

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-yellow-400 text-sm hover:underline flex items-center gap-1"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />} Toggle
              visibility
            </button>

            <button
              onClick={handleChangePassword}
              className="bg-yellow-400 text-gray-900 py-2 px-5 rounded-lg font-semibold hover:bg-yellow-300 transition-all flex items-center gap-2"
            >
              <Lock size={18} /> Update Password
            </button>
          </div>
        </section>

        {/* === 2FA === */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-yellow-400 flex items-center gap-2">
            <ShieldCheck /> Security & 2FA
          </h2>

          {twoFAEnabled ? (
            <p className="text-green-400 font-semibold">
              ✅ 2FA is currently enabled on your account.
            </p>
          ) : (
            <div className="space-y-3">
              {!otpSecret ? (
                <button
                  onClick={handleEnable2FA}
                  className="bg-yellow-400 text-gray-900 py-2 px-5 rounded-lg font-semibold hover:bg-yellow-300 transition-all"
                >
                  Enable 2FA
                </button>
              ) : (
                <>
                  <p className="text-sm text-gray-300">
                    Use your authenticator app and enter this 6-digit code:
                  </p>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full bg-blue-900/50 border border-blue-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-400"
                  />
                  <button
                    onClick={handleVerify2FA}
                    className="bg-yellow-400 text-gray-900 py-2 px-5 rounded-lg font-semibold hover:bg-yellow-300 transition-all"
                  >
                    Verify Code
                  </button>
                </>
              )}
            </div>
          )}
        </section>

        {/* === Suppression du compte === */}
        <section>
          <h2 className="text-xl font-bold mb-3 text-yellow-400 flex items-center gap-2">
            <Trash2 /> Danger Zone
          </h2>
          <button
            onClick={handleDeleteAccount}
            className="bg-red-600 hover:bg-red-500 text-white py-2 px-5 rounded-lg font-semibold transition-all"
          >
            Delete My Account
          </button>
        </section>

        {/* === Déconnexion === */}
        <div className="mt-10 text-center">
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="bg-yellow-400 text-gray-900 py-2 px-5 rounded-lg font-semibold hover:bg-yellow-300 transition-all flex items-center justify-center mx-auto gap-2"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}
