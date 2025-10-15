import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, User } from "lucide-react";

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      setProfilePicUrl("/default-avatar.png");
    } else {
      setIsLoggedIn(false);
      setProfilePicUrl(null);
    }
  }, []);

  const navigation = [
    { name: "Home", href: "/home" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Clock", href: "/clock" },
    { name: "Chat", href: "/chat" },
    { name: "My Account", href: "/account" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-blue-950/95 backdrop-blur-md border-b border-blue-800 shadow-lg">
      <div className="max-w-7xl mx-auto flex justify-between items-center h-16 px-6">
        {/* LOGO */}
        <div className="flex items-center gap-3">
          <img
            src="https://cdn-icons-png.flaticon.com/512/2103/2103691.png"
            alt="Epitime Logo"
            className="rounded-md w-10 h-10"
          />
          <Link
            to="/home"
            className="text-xl font-bold text-yellow-400 hover:text-yellow-300 transition-all"
          >
            Epitime
          </Link>
        </div>

        {/* NAV LINKS DESKTOP */}
        <div className="hidden md:flex items-center gap-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`font-medium text-sm tracking-wide transition-all ${
                location.pathname === item.href
                  ? "text-yellow-400 border-b-2 border-yellow-400 pb-1"
                  : "text-white hover:text-yellow-300"
              }`}
            >
              {item.name}
            </Link>
          ))}

          {/* PROFILE BUTTON */}
          <Link
            to={isLoggedIn ? "/account" : "/login"}
            className="flex items-center justify-center h-10 w-10 rounded-full overflow-hidden bg-yellow-400 hover:bg-yellow-300 transition-all transform hover:scale-110 border border-white/20 shadow-md"
          >
            {profilePicUrl ? (
              <img
                src={profilePicUrl}
                alt="Profile"
                className="object-cover rounded-full w-10 h-10"
              />
            ) : (
              <User className="h-5 w-5 text-gray-900" />
            )}
          </Link>
        </div>

        {/* MOBILE MENU TOGGLE */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-yellow-400 hover:text-yellow-300 transition-all"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {isMenuOpen && (
        <div className="md:hidden bg-blue-950/95 border-t border-blue-800 p-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setIsMenuOpen(false)}
              className={`block py-2 text-lg transition-all ${
                location.pathname === item.href
                  ? "text-yellow-400 font-semibold"
                  : "text-white hover:text-yellow-300"
              }`}
            >
              {item.name}
            </Link>
          ))}

          <div className="mt-4 border-t border-blue-800 pt-3">
            <Link
              to={isLoggedIn ? "/account" : "/login"}
              className="block w-full bg-yellow-400 text-gray-900 text-center font-semibold py-2 rounded-lg hover:bg-yellow-300 transition-all"
              onClick={() => setIsMenuOpen(false)}
            >
              {isLoggedIn ? "My Account" : "Sign In"}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
