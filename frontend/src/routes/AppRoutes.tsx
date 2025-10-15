import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Dashboard from "../pages/Dashboard";
import Clock from "../pages/Clock";
import Chat from "../pages/Chat";
import Account from "../pages/Account";
import Login from "../pages/Login";
import NotFound from "../pages/404"; 
import Navbar from "../components/Navbar"; 

function AppRoutes() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clock" element={<Clock />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/account" element={<Account />} />
        <Route path="/login" element={<Login />} />

        {/* 👇 Route pour tout ce qui n'existe pas */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default AppRoutes;
