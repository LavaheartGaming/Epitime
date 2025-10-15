import React, { useState } from "react";
// Assurez-vous d'avoir 'react-router-dom' installé pour utiliser useNavigate
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
// Framer Motion est une librairie React standard
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle,
  CalendarDays,
  User,
  BarChart2,
} from "lucide-react";


const teammates = [
  { id: 1, name: "Willy Wonka (Manager)", role: "Engineering Manager", status: "available" },
  { id: 2, name: "Charlie Bucket", role: "Backend Developer", status: "busy" },
  { id: 3, name: "Veruca Salt", role: "Frontend Developer", status: "available" },
  { id: 4, name: "Mike Teevee", role: "QA Engineer", status: "available" },
  { id: 5, name: "Violet Beauregarde", role: "DevOps", status: "away" },
];

const statuses = {
  available: "bg-green-500",
  busy: "bg-red-500",
  away: "bg-yellow-400",
};

const tasks = [
  { title: "Refactor API endpoints", assignee: "Me", priority: "High", progress: 80, due: "2025-10-15" },
  { title: "Design new login UI", assignee: "Veruca", priority: "Medium", progress: 60, due: "2025-10-18" },
  { title: "Database optimization", assignee: "Charlie", priority: "High", progress: 30, due: "2025-10-20" },
  { title: "Weekly report", assignee: "Me", priority: "Low", progress: 100, due: "2025-10-05" },
];

const mockDailyData = [
  { day: "Mon", hours: 7 },
  { day: "Tue", hours: 8 },
  { day: "Wed", hours: 6 },
  { day: "Thu", hours: 7.5 },
  { day: "Fri", hours: 5 },
  { day: "Sat", hours: 0 },
  { day: "Sun", hours: 0 },
];

// Le composant doit être englobé par un <Router> (React Router) pour que useNavigate fonctionne.
export default function EpitimeDashboard() {
  // Remplacement de useRouter() par useNavigate()
  const navigate = useNavigate(); 
  const [mode, setMode] = useState<"daily" | "weekly">("daily");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedMate, setSelectedMate] = useState<any>(null);
  const [showTable, setShowTable] = useState(false);

  const totalHours = mockDailyData.reduce((acc, cur) => acc + cur.hours, 0);
  const averageHours = (totalHours / mockDailyData.length).toFixed(1);

  return (
    <div className="min-h-screen bg-[#123A8A] text-white flex flex-col items-center py-10">
      <h1 className="text-3xl font-extrabold mb-8">Epitime Dashboard</h1>

      {/* Personal Dashboard */}
      <div className="bg-[#0F2658] rounded-2xl shadow-lg p-6 w-[90%] max-w-6xl mb-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold lowercase">my work summary</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setMode("daily")}
              className={`px-4 py-1 rounded-full text-sm ${
                mode === "daily"
                  ? "bg-cyan-400 text-slate-900"
                  : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setMode("weekly")}
              className={`px-4 py-1 rounded-full text-sm ${
                mode === "weekly"
                  ? "bg-cyan-400 text-slate-900"
                  : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              Weekly
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockDailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" />
            <XAxis dataKey="day" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e3a8a",
                border: "none",
                color: "white",
              }}
            />
            <Line
              type="monotone"
              dataKey="hours"
              stroke="#22d3ee"
              strokeWidth={3}
              dot={{ fill: "#22d3ee", r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Résumé des heures */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center mt-8">
          <div className="bg-slate-800/60 p-4 rounded-xl">
            <h3 className="text-lg font-semibold">Total Hours</h3>
            <p className="text-2xl font-bold text-cyan-400">{totalHours}h</p>
          </div>
          <div className="bg-slate-800/60 p-4 rounded-xl">
            <h3 className="text-lg font-semibold">Average</h3>
            <p className="text-2xl font-bold text-cyan-400">{averageHours}h</p>
          </div>
          <div className="bg-slate-800/60 p-4 rounded-xl">
            <h3 className="text-lg font-semibold">Punctuality</h3>
            <p className="text-2xl font-bold text-green-400">96%</p>
          </div>
          <div className="bg-slate-800/60 p-4 rounded-xl">
            <h3 className="text-lg font-semibold">Late Arrivals</h3>
            <p className="text-2xl font-bold text-red-400">2</p>
          </div>
        </div>

        {/* Bouton affichage du tableau */}
        <div className="text-center mt-8">
          <button
            onClick={() => setShowTable(!showTable)}
            className="px-5 py-2 rounded-full bg-cyan-400 text-slate-900 font-semibold hover:bg-cyan-300"
          >
            {showTable ? "Hide detailed hours" : "+ View detailed hours table"}
          </button>
        </div>

        {/* Tableau des heures détaillé */}
        <AnimatePresence>
          {showTable && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-8"
            >
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="text-slate-300 border-b border-slate-700">
                    <th className="py-2">Date</th>
                    <th className="py-2">Check-in</th>
                    <th className="py-2">Check-out</th>
                    <th className="py-2">Total Hours</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { date: "2025-10-06", in: "08:05", out: "16:45", hours: 7.5, status: "On time" },
                    { date: "2025-10-07", in: "08:30", out: "17:15", hours: 7.7, status: "Late" },
                    { date: "2025-10-08", in: "07:55", out: "16:00", hours: 8, status: "On time" },
                    { date: "2025-10-09", in: "08:10", out: "17:00", hours: 8.2, status: "On time" },
                    { date: "2025-10-10", in: "08:20", out: "16:50", hours: 7.3, status: "Late" },
                  ].map((r, i) => (
                    <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/40 transition">
                      <td className="py-2">{r.date}</td>
                      <td className="py-2">{r.in}</td>
                      <td className="py-2">{r.out}</td>
                      <td className="py-2 text-cyan-400">{r.hours}h</td>
                      <td className={`py-2 ${r.status === "Late" ? "text-red-400" : "text-green-400"}`}>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Team Section */}
      <div className="bg-[#0F2658] rounded-2xl shadow-lg p-6 w-[90%] max-w-6xl mb-10">
        <h2 className="text-xl font-bold mb-6 lowercase">my team</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {teammates.map((tm) => (
            <button
              key={tm.id}
              onClick={() => {
                setSelectedMate(tm);
                setDrawerOpen(true);
              }}
              className="flex justify-between items-center bg-slate-800/60 px-4 py-3 rounded-full hover:bg-slate-700 border border-slate-600 hover:border-cyan-400"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-500" />
                <div className="text-left">
                  <div className="font-semibold text-sm">{tm.name}</div>
                  <div className="text-xs text-slate-300">{tm.role}</div>
                </div>
              </div>
              <span className={`w-3 h-3 rounded-full ${statuses[tm.status as keyof typeof statuses]}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Section */}
      <div className="bg-[#0F2658] rounded-2xl shadow-lg p-6 w-[90%] max-w-6xl">
        <h2 className="text-xl font-bold mb-6 lowercase">project tasks overview</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {tasks.map((t, i) => (
            <div
              key={i}
              className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 hover:border-cyan-400 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">{t.title}</h4>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    t.priority === "High"
                      ? "bg-red-500/80"
                      : t.priority === "Medium"
                      ? "bg-yellow-500/80"
                      : "bg-green-500/80"
                  }`}
                >
                  {t.priority}
                </span>
              </div>
              <div className="text-xs text-slate-300 mb-2">Assigned to: {t.assignee}</div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-2 bg-cyan-400" style={{ width: `${t.progress}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-400">
                <span>{t.progress}% done</span>
                <span>Due {new Date(t.due).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.aside
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 20 }}
            className="fixed right-0 top-0 h-full w-[90vw] sm:w-[420px] bg-slate-900 text-slate-100 shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase text-slate-400">teammate</div>
                <div className="text-xl font-semibold">{selectedMate?.name}</div>
                <div className="text-slate-400 text-sm">{selectedMate?.role}</div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-8">
              <div>
                <div className="text-sm mb-3 text-slate-300">Book a meeting</div>
                <div className="space-y-3">
                  <input type="date" className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 w-full" />
                  <input type="time" className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 w-full" />
                  <button className="rounded-xl bg-cyan-400 text-slate-900 font-semibold py-2 w-full hover:bg-cyan-300">
                    Confirm meeting
                  </button>
                </div>
              </div>

              <div>
                <div className="text-sm mb-3 text-slate-300">Add quick task</div>
                <div className="flex gap-2">
                  <input
                    placeholder="Task title..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2"
                  />
                  <button className="px-4 rounded-xl bg-emerald-400 text-slate-900 font-semibold hover:bg-emerald-300">
                    Add
                  </button>
                </div>
              </div>

              <div>
                <div className="text-sm mb-3 text-slate-300">Today's schedule</div>
                <div className="space-y-2">
                  {[
                    { time: "09:00", title: "Daily stand-up" },
                    { time: "11:00", title: "Code review" },
                    { time: "14:30", title: "Sprint planning" },
                  ].map((event, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-3 py-2 border border-slate-700"
                    >
                      <div className="text-xs text-slate-300 w-16">{event.time}</div>
                      <div className="text-sm">{event.title}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* --- START A CHAT BUTTON --- */}
              <div className="p-6 border-t border-white/10 mt-6">
                <div className="text-sm mb-3 text-slate-300">Start a chat</div>
                <button
                  onClick={() => navigate("/chat")} // 🟢 Changé de router.push() à navigate()
                  className="w-full bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-semibold py-2 rounded-xl transition-all"
                >
                  Go to Chat
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
