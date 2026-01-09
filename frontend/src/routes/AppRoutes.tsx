import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "../pages/Home";
import Dashboard from "../pages/Dashboard";
import Clock from "../pages/Clock";
import Chat from "../pages/Chat";
import Account from "../pages/Account";
import Login from "../pages/Login";
import NotFound from "../pages/404";
import Navbar from "../components/Navbar";
import TeamManagerPage from "../pages/TeamManager"
import { useAuth } from "../context/AuthContext";
import React, { ReactElement } from "react";
// Route protégée
// Loading spinner component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-epitimeBlue flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-400 border-t-transparent"></div>
    </div>
  );
}

function PrivateRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
}

// Redirect if already logged in
function PublicOnlyRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Router>
      {/* Navbar visible only if logged in */}
      {user && <Navbar />}

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />

        {/* Protected Routes */}
        <Route path="/team" element={<PrivateRoute><TeamManagerPage /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/clock" element={<PrivateRoute><Clock /></PrivateRoute>} />
        <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
        <Route path="/account" element={<PrivateRoute><Account /></PrivateRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default AppRoutes;
