import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff, Phone } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// ✅ Composant de notification modale
function NotificationModal({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  if (!message) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
      <div className="bg-blue-900 border border-yellow-400 rounded-xl p-6 shadow-2xl max-w-sm w-full text-center">
        <p className="text-white text-lg font-semibold mb-4">{message}</p>
        <button
          onClick={onClose}
          className="bg-yellow-400 text-gray-900 py-2 px-6 rounded-lg font-semibold hover:bg-yellow-300 transition-all"
        >
          OK
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");

 const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    email: "",
    password: "",
    confirmPassword: "",
  });


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const endpoint = isLogin
    ? `${API_URL}/api/users/login/`
    : `${API_URL}/api/users/register/`;

  const payload = isLogin
    ? { email: formData.email, password: formData.password }
    : {
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
      };

  try {
    console.log(" Sending request to:", endpoint, "with payload:", payload);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // 🔍 Try to parse JSON safely
    let data: any = null;
    try {
      data = await response.json();
    } catch (err) {
      console.error("❌ Failed to parse JSON response:", err);
    }

    console.log("🔹 Response status:", response.status, "data:", data);

    if (response.ok) {
      setNotificationMessage(
        isLogin ? "✅ Login successful!" : "✅ Account created successfully!"
      );

      if (isLogin && data && data.access && data.user) {
        localStorage.setItem("access_token", data.access);
        login(data.user);
      }

      setTimeout(() => navigate("/account"), 1000);
    } else {
      // 🧠 Build a meaningful error message
      let message =
        (data && (data.error || data.detail)) ||
        "";

      // If it's a validation error dict: { "email": ["..."], "password": ["..."] }
      if (!message && data && typeof data === "object") {
        const keys = Object.keys(data);
        if (keys.length > 0) {
          const firstKey = keys[0];               // e.g. "email"
          const firstVal = (data as any)[firstKey];

          if (Array.isArray(firstVal) && firstVal.length > 0) {
            message = firstVal[0];
          } else if (typeof firstVal === "string") {
            message = firstVal;
          }
        }
      }

      console.warn("⚠️ Server returned 4xx/5xx with message:", message);
      setNotificationMessage(
        message || "❌ Invalid credentials or incomplete fields."
      );
    }
  } catch (err) {
    console.error("🌐 Network or fetch error:", err);
    setNotificationMessage("⚠️ Server unreachable. Try again later.");
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center text-white px-4 py-10">
      {/* ✅ Notification modale */}
      <NotificationModal
        message={notificationMessage}
        onClose={() => setNotificationMessage("")}
      />

      <div className="max-w-md w-full bg-blue-950/60 rounded-2xl p-8 shadow-2xl border border-blue-700/50 backdrop-blur-xl">
        <div className="flex justify-center mb-6">
          <img
            src="https://cdn-icons-png.flaticon.com/512/2103/2103691.png"
            alt="Epitime Logo"
            width={80}
            height={80}
            className="w-20 h-20"
          />
        </div>

        <h2 className="text-3xl font-bold text-center mb-6 text-yellow-400">
          {isLogin ? "Login" : "Sign Up"}
        </h2>

         <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-sm mb-2">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300" />
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    placeholder="John"
                    className="w-full pl-10 pr-4 py-3 bg-blue-900/50 border border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>

              <div className="w-1/2">
                <label className="block text-sm mb-2">Last Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300" />
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                    placeholder="Doe"
                    className="w-full pl-10 pr-4 py-3 bg-blue-900/50 border border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="example@mail.com"
                className="w-full pl-10 pr-4 py-3 bg-blue-900/50 border border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm mb-2">Phone number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300" />
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  required
                  placeholder="+33 6 00 00 00 00"
                  className="w-full pl-10 pr-4 py-3 bg-blue-900/50 border border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 bg-blue-900/50 border border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-300 hover:text-yellow-300"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm mb-2">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-blue-900/50 border border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          )}

          {!isLogin && (
            <div className="flex items-start gap-3 text-sm">
              <input
                id="acceptTerms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 accent-yellow-400"
              />
              <label htmlFor="acceptTerms">
                I agree to the{" "}
                <a href="#" className="text-yellow-400 hover:underline">
                  terms of service
                </a>
                .
              </label>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-yellow-400 text-gray-900 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-all transform hover:scale-105"
          >
            {isLogin ? "Log In" : "Create Account"}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-yellow-400 hover:underline font-semibold"
            >
              {isLogin ? "Sign Up" : "Log In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
