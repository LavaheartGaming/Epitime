// Fichier : ClockDashboard.jsx (ou .tsx)

import React, { useState } from "react";
// Framer Motion est une librairie React standard, pas besoin de la remplacer.
import { motion } from "framer-motion";
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle,
  CalendarDays,
  User,
  BarChart2,
} from "lucide-react";

// Suppression de "use client";
export function ClockDashboard() {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [userName, setUserName] = useState("John Doe");
  const [records, setRecords] = useState<
    { date: string; in?: string; out?: string; total?: number }[]
  >([]);
  const [today] = useState(new Date().toLocaleDateString());
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleClockIn = () => {
    if (isClockedIn) return;
    const time = new Date().toLocaleTimeString();
    setIsClockedIn(true);
    setLastAction(`Clocked in at ${time}`);
    setRecords((prev) => [...prev, { date: today, in: time }]);
  };

  const handleClockOut = () => {
    if (!isClockedIn) return;
    const time = new Date().toLocaleTimeString();
    setIsClockedIn(false);
    setLastAction(`Clocked out at ${time}`);
    setRecords((prev) =>
      prev.map((r) =>
        r.date === today
          ? { ...r, out: time, total: Math.floor(Math.random() * 3 + 7) } // simulate total hours
          : r
      )
    );
  };

  const totalHours = records.reduce(
    (acc, r) => acc + (r.total || 0),
    0
  );
  const averageHours = records.length
    ? (totalHours / records.length).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-blue-900 to-indigo-900 text-white flex flex-col items-center py-12 px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <h1 className="text-4xl font-extrabold flex items-center justify-center gap-3">
          <Clock className="w-10 h-10 text-cyan-400" />
          My Workday Summary
        </h1>
        <p className="text-blue-200 mt-1">
          Track your working day, attendance, and time logs.
        </p>
      </motion.div>

      {/* User Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-[#0F2658] rounded-2xl shadow-lg p-6 w-full max-w-5xl mb-10 flex flex-col md:flex-row justify-between items-center"
      >
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className="bg-slate-800 p-3 rounded-full border border-slate-600">
            <User className="w-8 h-8 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{userName}</h2>
            <p className="text-sm text-blue-300">Software Engineer | Remote</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-blue-200 text-sm mb-1">Date</p>
          <h3 className="font-bold text-lg text-cyan-400">{today}</h3>
        </div>
      </motion.div>

      {/* Clock Controls */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-[#0F2658] rounded-2xl shadow-lg p-8 w-full max-w-3xl text-center"
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">
            {isClockedIn ? "You are clocked in!" : "You are clocked out."}
          </h2>
          <p className="text-blue-200 text-sm">
            {lastAction || "Start your workday by clocking in."}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          <button
            onClick={handleClockIn}
            disabled={isClockedIn}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-lg font-semibold transition-all ${
              isClockedIn
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-emerald-400 text-slate-900 hover:bg-emerald-300"
            }`}
          >
            <LogIn className="w-5 h-5" /> Clock In
          </button>

          <button
            onClick={handleClockOut}
            disabled={!isClockedIn}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-lg font-semibold transition-all ${
              !isClockedIn
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-red-400 text-slate-900 hover:bg-red-300"
            }`}
          >
            <LogOut className="w-5 h-5" /> Clock Out
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid md:grid-cols-4 gap-6 mt-10 w-full max-w-5xl text-center"
      >
        {[
          { label: "Total Hours", value: `${totalHours}h`, color: "text-cyan-400" },
          { label: "Average", value: `${averageHours}h`, color: "text-cyan-400" },
          { label: "Days Recorded", value: records.length, color: "text-green-400" },
          { label: "Punctuality", value: "96%", color: "text-yellow-400" },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-[#0F2658] rounded-xl py-4 shadow-md border border-slate-700 hover:border-cyan-400 transition"
          >
            <p className="text-sm text-slate-300">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* History Table */}
      {records.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#0F2658] mt-12 rounded-2xl shadow-lg p-6 w-full max-w-5xl"
        >
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-cyan-400" /> Attendance History
          </h3>
          <table className="w-full text-sm border-collapse text-left">
            <thead>
              <tr className="text-slate-300 border-b border-slate-700">
                <th className="py-2">Date</th>
                <th className="py-2">Clock In</th>
                <th className="py-2">Clock Out</th>
                <th className="py-2">Total Hours</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-slate-800 hover:bg-slate-800/40 transition"
                >
                  <td className="py-2">{r.date}</td>
                  <td className="py-2 text-emerald-400">{r.in || "-"}</td>
                  <td className="py-2 text-red-400">{r.out || "-"}</td>
                  <td className="py-2 text-cyan-400">
                    {r.total ? `${r.total}h` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}

export default ClockDashboard;