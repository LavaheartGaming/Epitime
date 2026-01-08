import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff, Phone } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // 🔍 Try to parse JSON safely
      let data: any = null;
      try {
        data = await response.json();
      } catch {
        // Failed to parse JSON response
      }

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
            const firstKey = keys[0];
            const firstVal = (data as any)[firstKey];

            if (Array.isArray(firstVal) && firstVal.length > 0) {
              message = firstVal[0];
            } else if (typeof firstVal === "string") {
              message = firstVal;
            }
          }
        }

        setNotificationMessage(
          message || "❌ Invalid credentials or incomplete fields."
        );
      }
    } catch {
      setNotificationMessage("⚠️ Server unreachable. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center text-white px-4 py-10">

      <Modal
        isOpen={!!notificationMessage}
        onClose={() => setNotificationMessage("")}
        title="Notification"
      >
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">{notificationMessage}</p>
          <Button onClick={() => setNotificationMessage("")}>OK</Button>
        </div>
      </Modal>

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
                <Input
                  id="first_name"
                  label="First Name"
                  value={formData.first_name}
                  onChange={(val) => updateField("first_name", val)}
                  required
                  placeholder="John"
                  startIcon={<User className="text-blue-300" size={18} />}
                />
              </div>

              <div className="w-1/2">
                <Input
                  id="last_name"
                  label="Last Name"
                  value={formData.last_name}
                  onChange={(val) => updateField("last_name", val)}
                  required
                  placeholder="Doe"
                  startIcon={<User className="text-blue-300" size={18} />}
                />
              </div>
            </div>
          )}

          <Input
            id="email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={(val) => updateField("email", val)}
            required
            placeholder="example@mail.com"
            startIcon={<Mail className="text-blue-300" size={18} />}
          />

          {!isLogin && (
            <Input
              id="phone_number"
              label="Phone number"
              type="tel"
              value={formData.phone_number}
              onChange={(val) => updateField("phone_number", val)}
              required
              placeholder="+33 6 00 00 00 00"
              startIcon={<Phone className="text-blue-300" size={18} />}
            />
          )}

          <Input
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(val) => updateField("password", val)}
            required
            placeholder="••••••••"
            startIcon={<Lock className="text-blue-300" size={18} />}
            endIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-blue-300 hover:text-yellow-300 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />

          {!isLogin && (
            <Input
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={(val) => updateField("confirmPassword", val)}
              required
              placeholder="••••••••"
              startIcon={<Lock className="text-blue-300" size={18} />}
            />
          )}

          {!isLogin && (
            <div className="flex items-center gap-3 text-sm">
              <input
                id="acceptTerms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-yellow-400 focus:ring-yellow-400"
              />
              <label htmlFor="acceptTerms">
                I agree to the{" "}
                <button type="button" className="text-yellow-400 hover:underline">
                  terms of service
                </button>
                .
              </label>
            </div>
          )}

          <Button
            type="submit"
            loading={loading}
            className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-300"
          >
            {isLogin ? "Log In" : "Create Account"}
          </Button>
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
