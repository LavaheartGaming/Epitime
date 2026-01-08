import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
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
import { Plus, Trash2 } from "lucide-react";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";

type TaskType = {
  id: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimated_duration: number;
  progress: number;
  due_date: string | null;
  assigned_to_name: string;
};

// Le composant doit être englobé par un <Router> (React Router) pour que useNavigate fonctionne.
export default function EpitimeDashboard() {
  const { user } = useAuth();
  // Remplacement de useRouter() par useNavigate()
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
  type TeamMate = {
    id: number;
    full_name: string;
    email: string;
    role: string;
    is_clocked_in: boolean;
    open_clock_in: string | null;
    today_status: "normal" | "late" | "pto";
    today_status_note: string;
  };

  const [team, setTeam] = useState<TeamMate[]>([]);
  const [teamManager, setTeamManager] = useState<TeamMate | null>(null);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [_loadingEntries, setLoadingEntries] = useState(false);

  const fetchWithAuth = async (url: string) => {
    const token = localStorage.getItem("access_token");
    return fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  };

  useEffect(() => {
    const loadTeam = async () => {
      if (!user) return;
      try {
        const res = await fetchWithAuth(`${API_URL}/api/users/me/team/`);
        const data = await res.json();
        if (!res.ok) {
          setTeam([]);
          setTeamManager(null);
          return;
        }
        setTeam(Array.isArray(data?.members) ? data.members : []);
        setTeamManager(data?.manager || null);
      } catch {
        setTeam([]);
        setTeamManager(null);
      }
    };

    loadTeam();
  }, [user, API_URL]);

  // Load time entries for current user
  useEffect(() => {
    const loadTimeEntries = async () => {
      if (!user) return;
      setLoadingEntries(true);
      try {
        const res = await fetchWithAuth(`${API_URL}/api/users/time-entries/`);
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setTimeEntries(data);
        } else {
          setTimeEntries([]);
        }
      } catch {
        setTimeEntries([]);
      } finally {
        setLoadingEntries(false);
      }
    };

    loadTimeEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Task states
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    priority: "medium" as "low" | "medium" | "high",
    estimated_duration: 1,
    due_date: "",
  });
  const [taskLoading, setTaskLoading] = useState(false);

  // Load tasks
  useEffect(() => {
    const loadTasks = async () => {
      if (!user) return;
      try {
        const res = await fetchWithAuth(`${API_URL}/api/users/tasks/`);
        const data = await res.json();
        if (res.ok) {
          setTasks(Array.isArray(data) ? data : []);
        }
      } catch {
        setTasks([]);
      }
    };
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Create task handler
  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;
    setTaskLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/users/tasks/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: newTask.title,
          priority: newTask.priority,
          estimated_duration: newTask.estimated_duration,
          due_date: newTask.due_date || null,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setTasks((prev) => [created, ...prev]);
        setNewTask({ title: "", priority: "medium", estimated_duration: 1, due_date: "" });
        setShowTaskModal(false);
      }
    } catch {
      // Failed to create task
    } finally {
      setTaskLoading(false);
    }
  };

  // Delete task handler
  const handleDeleteTask = async (taskId: number) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/users/tasks/${taskId}/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch {
      // Failed to delete task
    }
  };

  const [mode, setMode] = useState<"daily" | "weekly">("daily");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedMate, setSelectedMate] = useState<any>(null);
  const [showTable, setShowTable] = useState(false);

  // Calculate daily/weekly data from time entries
  const chartData = useMemo(() => {
    if (!timeEntries.length) {
      return [
        { day: "Mon", hours: 0 },
        { day: "Tue", hours: 0 },
        { day: "Wed", hours: 0 },
        { day: "Thu", hours: 0 },
        { day: "Fri", hours: 0 },
        { day: "Sat", hours: 0 },
        { day: "Sun", hours: 0 },
      ];
    }

    // Get last 7 days
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return last7Days.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      const dayEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.clock_in).toISOString().split('T')[0];
        return entryDate === dateStr;
      });

      const totalHours = dayEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);

      return {
        day: dayNames[date.getDay()],
        hours: Math.round(totalHours * 10) / 10,
      };
    });
  }, [timeEntries]);

  const totalHours = chartData.reduce((acc, cur) => acc + cur.hours, 0);
  const averageHours = chartData.length > 0 ? (totalHours / chartData.length).toFixed(1) : "0.0";

  // Calculate punctuality and late arrivals


  const displayTeam = useMemo(() => {
    const list: TeamMate[] = [];
    if (teamManager) list.push(teamManager); // 👈 manager clickable
    return list.concat(team); // 👈 other members
  }, [teamManager, team]);

  // Drawer form states - mocked for UI
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [quickTask, setQuickTask] = useState("");

  return (
    <div className="min-h-screen bg-[#123A8A] text-white flex flex-col items-center py-10">
      <h1 className="text-3xl font-extrabold mb-8">Epitime Dashboard</h1>

      {/* Personal Dashboard */}
      <div className="bg-[#0F2658] rounded-2xl shadow-lg p-6 w-[90%] max-w-6xl mb-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold lowercase">my work summary</h2>
          <div className="flex gap-3" role="group" aria-label="Chart view mode">
            <button
              onClick={() => setMode("daily")}
              aria-pressed={mode === "daily"}
              className={`px-4 py-1 rounded-full text-sm transition-colors ${mode === "daily"
                ? "bg-cyan-400 text-slate-900"
                : "bg-slate-700 hover:bg-slate-600"
                }`}
            >
              Daily
            </button>
            <button
              onClick={() => setMode("weekly")}
              aria-pressed={mode === "weekly"}
              className={`px-4 py-1 rounded-full text-sm transition-colors ${mode === "weekly"
                ? "bg-cyan-400 text-slate-900"
                : "bg-slate-700 hover:bg-slate-600"
                }`}
            >
              Weekly
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
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

        </div>

        {/* Bouton affichage du tableau */}
        <div className="text-center mt-8">
          <Button
            onClick={() => setShowTable(!showTable)}
            variant="secondary"
            className="rounded-full bg-cyan-400 text-slate-900 hover:bg-cyan-300 border-none"
          >
            {showTable ? "Hide detailed hours" : "+ View detailed hours table"}
          </Button>
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

                  </tr>
                </thead>
                <tbody>
                  {timeEntries.map((entry, i) => {
                    const date = new Date(entry.clock_in).toLocaleDateString();
                    const clockIn = new Date(entry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const clockOut = entry.clock_out
                      ? new Date(entry.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : "—";

                    // Determine status


                    return (
                      <tr key={entry.id || i} className="border-b border-slate-800 hover:bg-slate-800/40 transition">
                        <td className="py-2">{date}</td>
                        <td className="py-2">{clockIn}</td>
                        <td className="py-2">{clockOut}</td>
                        <td className="py-2 text-cyan-400">{entry.total_hours || "—"}h</td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Team Section */}
      <div className="bg-[#0F2658] rounded-2xl shadow-lg p-6 w-[90%] max-w-6xl mb-10">
        <h2 className="text-xl font-bold mb-2 lowercase">my team</h2>
        {teamManager && (
          <div className="text-sm text-slate-300 mb-6">
            Manager: <span className="text-yellow-300 font-semibold">{teamManager.full_name}</span>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {displayTeam.length === 0 ? (
            <div className="text-slate-300">
              No manager assigned yet (ask an admin to assign you to a manager).
            </div>
          ) : (
            displayTeam.map((tm) => (
              <button
                key={`tm-${tm.id}`}
                onClick={() => {
                  setSelectedMate(tm);
                  setDrawerOpen(true);
                }}
                className="flex justify-between items-center bg-slate-800/60 px-4 py-3 rounded-full hover:bg-slate-700 border border-slate-600 hover:border-cyan-400 text-white w-full"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-500" />
                  <div className="text-left">
                    <div className="font-semibold text-sm">
                      {tm.full_name}
                      {teamManager && tm.id === teamManager.id && (
                        <span className="ml-2 text-xs text-yellow-300 font-semibold">
                          (Manager)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-300">{tm.role}</div>
                  </div>
                </div>

                {/* Status dot (manager can still have one, optional but fine) */}
                <span
                  className={`w-3 h-3 rounded-full ${tm.today_status === "pto"
                    ? "bg-yellow-400"
                    : tm.today_status === "late"
                      ? "bg-red-500"
                      : tm.is_clocked_in
                        ? "bg-green-500"
                        : "bg-slate-400"
                    }`}
                />
              </button>
            ))
          )}
        </div>


      </div>

      {/* Tasks Section */}
      <div className="bg-[#0F2658] rounded-2xl shadow-lg p-6 w-[90%] max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold lowercase">project tasks overview</h2>
          <Button
            onClick={() => setShowTaskModal(true)}
            className="flex items-center gap-2 rounded-full bg-cyan-400 text-slate-900 border-none hover:bg-cyan-300"
            variant="primary"
          >
            <Plus size={18} aria-hidden="true" />
            Create Task
          </Button>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            No tasks yet. Click "Create Task" to add your first task!
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {tasks.map((t: TaskType) => (
              <div
                key={t.id}
                className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 hover:border-cyan-400 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm flex-1">{t.title}</h4>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full capitalize ${t.priority === "high"
                        ? "bg-red-500/80"
                        : t.priority === "medium"
                          ? "bg-yellow-500/80"
                          : "bg-green-500/80"
                        }`}
                    >
                      {t.priority}
                    </span>
                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition"
                      title="Delete task"
                      aria-label={`Delete task: ${t.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-slate-300 mb-2">
                  Assigned to: {t.assigned_to_name || "Me"}
                </div>
                <div className="text-xs text-slate-400 mb-2">
                  Duration: {t.estimated_duration}h
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-2 bg-cyan-400" style={{ width: `${t.progress}%` }} />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-400">
                  <span>{t.progress}% done</span>
                  {t.due_date && <span>Due {new Date(t.due_date).toLocaleString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
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
                <div className="text-xl font-semibold">{selectedMate?.full_name}</div>
                <div className="text-slate-400 text-sm">{selectedMate?.role}</div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600"
                aria-label="Close details"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-8">
              <div>
                <h3 className="text-sm mb-3 text-slate-300 font-medium">Book a meeting</h3>
                <div className="space-y-3">
                  <Input
                    id="meeting-date"
                    label="Date"
                    type="date"
                    value={meetingDate}
                    onChange={setMeetingDate}
                  />
                  <Input
                    id="meeting-time"
                    label="Time"
                    type="time"
                    value={meetingTime}
                    onChange={setMeetingTime}
                  />
                  <Button
                    onClick={() => { }}
                    className="w-full bg-cyan-400 text-slate-900 border-none hover:bg-cyan-300"
                  >
                    Confirm meeting
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-sm mb-3 text-slate-300 font-medium">Add quick task</h3>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      id="quick-task"
                      label="Title"
                      value={quickTask}
                      onChange={setQuickTask}
                      placeholder="Task title..."
                    />
                  </div>
                  <Button
                    className="rounded-xl bg-emerald-400 text-slate-900 border-none hover:bg-emerald-300 mb-[2px]"
                    onClick={() => { }}
                  >
                    Add
                  </Button>
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
                <Button
                  onClick={() => navigate("/chat")}
                  className="w-full bg-cyan-400 hover:bg-cyan-300 text-slate-900 border-none"
                >
                  Go to Chat
                </Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Task Creation Modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="Create New Task"
      >
        <div className="space-y-4">
          <Input
            id="task-title"
            label="Title *"
            value={newTask.title}
            onChange={(val) => setNewTask({ ...newTask, title: val })}
            placeholder="Enter task title..."
          />

          <div>
            <label htmlFor="task-priority" className="block text-sm text-slate-300 mb-1">
              Priority
            </label>
            <select
              id="task-priority"
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as "low" | "medium" | "high" })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <Input
            id="task-duration"
            label="Estimated Duration (hours)"
            type="number"
            value={String(newTask.estimated_duration)}
            onChange={(val) => setNewTask({ ...newTask, estimated_duration: parseFloat(val) || 1 })}
          />
          {/* Note: Input prop 'type="number"' works but component expects string value, handled above */}

          <Input
            id="task-deadline"
            label="Deadline (Date & Time)"
            type="datetime-local"
            value={newTask.due_date}
            onChange={(val) => setNewTask({ ...newTask, due_date: val })}
          />

          <Button
            onClick={handleCreateTask}
            disabled={taskLoading || !newTask.title.trim()}
            loading={taskLoading}
            className="w-full mt-4 bg-cyan-400 text-slate-900 hover:bg-cyan-300 border-none"
          >
            Create Task
          </Button>
        </div>
      </Modal>
    </div>
  );
}
