// Fichier : Account.tsx

import React, { useState, useEffect } from "react";
// Les icônes de Lucide React sont des dépendances standard de React
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Lock,
  Trash2,
  Bell,
  Settings,
  Shield,
} from "lucide-react";

export function AccountPage() { // L'exportation nommée existante est conservée
  // Utilisation de l'interface User pour le type (si TypeScript)
  const [openSection, setOpenSection] = useState<string | null>("profile");
  const [user, setUser] = useState<{ name: string; role: string }>({
    name: "Guest",
    role: "user", // default role
  });

  // Simulation de l'authentification (conserver le useEffect, c'est du React pur)
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      // Default demo user
      setUser({ name: "Luca", role: "user" });
    }
  }, []);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  // Message basé sur le rôle
  const roleMessage =
    user.role === "admin"
      ? "You have administrative rights. You can manage all users, teams, and configurations."
      : user.role === "manager"
      ? "You manage a team. Track attendance, manage tasks, and oversee performance."
      : "You can track your hours, view tasks, and manage your personal preferences.";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-blue-900 to-indigo-900 text-white py-16 px-6 flex flex-col items-center">
      {/* Header */}
      <div className="text-center mb-12">
        <img
          src="https://cdn-icons-png.flaticon.com/512/2103/2103691.png"
          alt="Epitime Logo"
          className="w-24 h-24 mx-auto mb-4 rounded-full shadow-lg"
        />
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">
          Hello, {user.name} 👋
        </h1>
        <p className="text-white/70">{roleMessage}</p>
      </div>

      {/* Content */}
      <div className="w-full max-w-3xl flex flex-col gap-4">
        {/* Account management */}
        <AccountSection
          title="Account Management"
          icon={<Settings className="text-yellow-400" />}
          isOpen={openSection === "profile"}
          onToggle={() => toggleSection("profile")}
        >
          <ul className="space-y-3">
            <li className="flex items-center gap-2 hover:text-yellow-300 cursor-pointer transition-colors">
              <Pencil size={16} /> Edit profile information
            </li>
            <li className="flex items-center gap-2 hover:text-yellow-300 cursor-pointer transition-colors">
              <Lock size={16} /> Change password
            </li>
            <li className="flex items-center gap-2 hover:text-red-400 cursor-pointer transition-colors">
              <Trash2 size={16} /> Delete account
            </li>
          </ul>
        </AccountSection>

        {/* Role-specific section */}
        {user.role === "manager" && (
          <AccountSection
            title="Team Management"
            icon={<Bell className="text-yellow-400" />}
            isOpen={openSection === "team"}
            onToggle={() => toggleSection("team")}
          >
            <p className="text-white/80 text-sm">
              Manage your team members, review attendance, and monitor KPIs.
            </p>
          </AccountSection>
        )}

        {user.role === "admin" && (
          <AccountSection
            title="System Administration"
            icon={<Shield className="text-yellow-400" />}
            isOpen={openSection === "admin"}
            onToggle={() => toggleSection("admin")}
          >
            <p className="text-white/80 text-sm">
              Access full administrative controls including user management,
              database monitoring, and configuration settings.
            </p>
          </AccountSection>
        )}

        {/* Preferences */}
        <AccountSection
          title="Preferences & Notifications"
          icon={<Bell className="text-yellow-400" />}
          isOpen={openSection === "prefs"}
          onToggle={() => toggleSection("prefs")}
        >
          <ul className="space-y-3">
            <li>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="accent-yellow-400" />
                Receive daily task reminders
              </label>
            </li>
            <li>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="accent-yellow-400" />
                Enable automatic dark mode
              </label>
            </li>
          </ul>
        </AccountSection>

        {/* Security */}
        <AccountSection
          title="Security & Privacy"
          icon={<Lock className="text-yellow-400" />}
          isOpen={openSection === "security"}
          onToggle={() => toggleSection("security")}
        >
          <p className="text-white/80 text-sm">
            Your account is protected with standard authentication.
            <br />
            For better protection, enable Two-Factor Authentication (2FA).
          </p>
          <button className="mt-3 bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg hover:bg-yellow-300 font-semibold transition-all">
            Enable 2FA
          </button>
        </AccountSection>
      </div>
    </div>
  );
}

// Composant Enfant (pas de changement nécessaire, c'est du React standard)
function AccountSection({
  title,
  icon,
  children,
  isOpen,
  onToggle,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-blue-950/60 border border-blue-800 rounded-2xl shadow-md overflow-hidden transition-all duration-300">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left text-lg font-semibold text-yellow-400"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span>{title}</span>
        </div>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {isOpen && (
        // L'animation CSS (animate-fadeIn) dépend de votre configuration Tailwind CSS
        <div className="px-6 pb-6 text-white/90 text-sm animate-fadeIn"> 
          {children}
        </div>
      )}
    </div>
  );
}


export default AccountPage;