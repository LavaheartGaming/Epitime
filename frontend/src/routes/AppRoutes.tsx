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

// ...
function PrivateRoute({ children }: { children: ReactElement }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Router>
      {/* Navbar visible uniquement si connecté */}
      {user && <Navbar />}

      <Routes>
        <Route path="/team" element={<TeamManagerPage />} />
        <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
        <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/clock" element={<PrivateRoute><Clock /></PrivateRoute>} />
        <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
        <Route path="/account" element={<PrivateRoute><Account /></PrivateRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default AppRoutes;
