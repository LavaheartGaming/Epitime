import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, LogIn, LogOut, BarChart2, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";


interface TimeRecord {
  date: string; // formatted date for display (from clock_in)
  in?: string;
  out?: string;
  total?: number;
}

export function ClockDashboard() {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  const [isClockedIn, setIsClockedIn] = useState(false);
  const { user } = useAuth();

  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [today] = useState(new Date().toLocaleDateString());
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Signature state
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

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

  // Open modal instead of direct clock in
  const handleClockIn = async () => {
    setShowSignatureModal(true);
  };

  // Called when signature is confirmed
  const confirmClockIn = async (sig: string) => {
    setSignatureData(sig);
    setShowSignatureModal(false);
    setErrorMessage(null);
    setLoading(true);

    try {
      // Pass signature data if backend supports it (optional)
      const res = await fetchWithAuth(`${API_URL}/api/users/clock-in/`, "POST", {
        signature: sig
      });
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
    } finally {
      setLoading(false);
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
            <h2 className="text-xl font-semibold">{user ? user.full_name : "My dashboard"}</h2>
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
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-lg font-semibold transition-all ${loading || isClockedIn
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-emerald-400 text-slate-900 hover:bg-emerald-300"
              }`}
          >
            <LogIn className="w-5 h-5" /> Clock In
          </button>

          <button
            onClick={handleClockOut}
            disabled={loading || !isClockedIn}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-lg font-semibold transition-all ${loading || !isClockedIn
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
        className="grid md:grid-cols-3 gap-6 mt-10 w-full max-w-5xl text-center"
      >
        {[
          { label: "Total Hours", value: `${totalHours}h`, color: "text-cyan-400" },
          { label: "Average", value: `${averageHours}h`, color: "text-cyan-400" },
          { label: "Sessions Logged", value: records.length, color: "text-green-400" },
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

      {/* Signature Modal */}
      {showSignatureModal && (
        <SignatureModal
          onConfirm={confirmClockIn}
          onCancel={() => setShowSignatureModal(false)}
        />
      )}
    </div>
  );
}

// Simple Signature Canvas Component
const SignatureModal = ({
  onConfirm,
  onCancel,
}: {
  onConfirm: (signatureData: string) => void;
  onCancel: () => void;
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000000";

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      setIsDrawing(true);
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!isDrawing) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      setIsDrawing(false);
      ctx.beginPath();
    };

    canvas.addEventListener("mousedown", startDrawing as any);
    canvas.addEventListener("mousemove", draw as any);
    canvas.addEventListener("mouseup", stopDrawing as any);
    canvas.addEventListener("touchstart", startDrawing as any);
    canvas.addEventListener("touchmove", draw as any);
    canvas.addEventListener("touchend", stopDrawing as any);

    return () => {
      canvas.removeEventListener("mousedown", startDrawing as any);
      canvas.removeEventListener("mousemove", draw as any);
      canvas.removeEventListener("mouseup", stopDrawing as any);
      canvas.removeEventListener("touchstart", startDrawing as any);
      canvas.removeEventListener("touchmove", draw as any);
      canvas.removeEventListener("touchend", stopDrawing as any);
    };
  }, [isDrawing]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleConfirm = () => {
    if (canvasRef.current) {
      onConfirm(canvasRef.current.toDataURL());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md text-gray-900 shadow-2xl">
        <h3 className="text-xl font-bold mb-4 text-center">Sign to Clock In</h3>
        <div className="border-2 border-dashed border-gray-300 rounded-xl mb-4 bg-gray-50 touch-none">
          <canvas
            ref={canvasRef}
            width={350}
            height={200}
            className="w-full h-48 cursor-crosshair"
          />
        </div>
        <div className="flex justify-between gap-4">
          <button
            onClick={handleClear}
            className="text-sm text-gray-500 hover:text-red-500 font-semibold"
          >
            Clear
          </button>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 font-bold transition shadow-lg"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClockDashboard;
