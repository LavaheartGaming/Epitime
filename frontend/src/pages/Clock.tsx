import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, LogIn, LogOut, BarChart2, User } from "lucide-react";

interface TimeRecord {
  date: string; // formatted date for display (from clock_in)
  in?: string;
  out?: string;
  total?: number;
}

export function ClockDashboard() {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  const [isClockedIn, setIsClockedIn] = useState(false);
  const [userName] = useState("John Doe");

  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [today] = useState(new Date().toLocaleDateString());
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper to call API with JWT
  const fetchWithAuth = async (url: string, method = "GET", body?: any) => {
    const token = localStorage.getItem("access_token");
    const headers: any = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const options: any = { method, headers };
    if (body) options.body = JSON.stringify(body);

    return fetch(url, options);
  };

  // Load time entries from backend
  const loadRecords = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/time-entries/`);
      let data: any = [];
      try {
        data = await res.json();
      } catch {
        data = [];
      }

      if (!res.ok) {
        setErrorMessage("Unable to load time entries.");
        setRecords([]);
        setIsClockedIn(false);
        return;
      }

      // ✅ Each entry is a session: use clock_in for the displayed date
      const mapped: TimeRecord[] = (Array.isArray(data) ? data : []).map((entry: any) => ({
        date: entry.clock_in ? new Date(entry.clock_in).toLocaleDateString() : "-",
        in: entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString() : undefined,
        out: entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString() : undefined,
        total: entry.total_hours ?? undefined,
      }));

      setRecords(mapped);

      // ✅ Clocked in = there exists an open session (clock_out is null)
      const hasOpenSession =
        Array.isArray(data) && data.some((e: any) => e.clock_in && !e.clock_out);

      setIsClockedIn(hasOpenSession);
    } catch (err) {
      console.error(err);
      setErrorMessage("⚠️ Server unreachable.");
      setRecords([]);
      setIsClockedIn(false);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Load once on mount
  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClockIn = async () => {
    setErrorMessage(null);

    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/clock-in/`, "POST");
      const data = await res.json();

      if (res.ok) {
        const time = data.entry?.clock_in
          ? new Date(data.entry.clock_in).toLocaleTimeString()
          : new Date().toLocaleTimeString();

        setLastAction(`Clocked in at ${time}`);
        await loadRecords();
      } else {
        setErrorMessage(data.error || "❌ Could not clock in.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("⚠️ Server unreachable.");
    }
  };

  const handleClockOut = async () => {
    setErrorMessage(null);

    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/clock-out/`, "POST");
      const data = await res.json();

      if (res.ok) {
        const time = data.entry?.clock_out
          ? new Date(data.entry.clock_out).toLocaleTimeString()
          : new Date().toLocaleTimeString();

        setLastAction(`Clocked out at ${time}`);
        await loadRecords();
      } else {
        setErrorMessage(data.error || "❌ Could not clock out.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("⚠️ Server unreachable.");
    }
  };

  const totalHours = records.reduce((acc, r) => acc + (r.total || 0), 0);
  const averageHours = records.length ? (totalHours / records.length).toFixed(1) : "0";

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
        <p className="text-blue-200 mt-1">Track your working day, attendance, and time logs.</p>
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

      {errorMessage && (
        <div className="mb-6 bg-red-500/20 border border-red-400 text-red-200 px-4 py-2 rounded-xl max-w-3xl w-full text-center">
          {errorMessage}
        </div>
      )}

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
          <p className="text-blue-200 text-sm">{lastAction || "Start your workday by clocking in."}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          <button
            onClick={handleClockIn}
            disabled={loading || isClockedIn}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-lg font-semibold transition-all ${
              loading || isClockedIn
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-emerald-400 text-slate-900 hover:bg-emerald-300"
            }`}
          >
            <LogIn className="w-5 h-5" /> Clock In
          </button>

          <button
            onClick={handleClockOut}
            disabled={loading || !isClockedIn}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-lg font-semibold transition-all ${
              loading || !isClockedIn
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
          { label: "Sessions Logged", value: records.length, color: "text-green-400" },
          { label: "Punctuality", value: "96%", color: "text-yellow-400" }, // placeholder
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
                    {r.total !== undefined ? `${r.total}h` : "-"}
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
