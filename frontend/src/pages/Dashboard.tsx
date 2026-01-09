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
  assigned_to: number | null;
  assigned_to_name: string;
  created_by: number | null;
  created_by_name: string;
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
  const [teamName, setTeamName] = useState<string | null>(null);
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
          setTeamName(null);
          return;
        }
        setTeam(Array.isArray(data?.members) ? data.members : []);
        setTeamManager(data?.manager || null);
        setTeamName(data?.team_name || null);
      } catch {
        setTeam([]);
        setTeamManager(null);
        setTeamName(null);
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
  const [selectedMateTasks, setSelectedMateTasks] = useState<TaskType[]>([]);
  const [loadingMateTasks, setLoadingMateTasks] = useState(false);
  const [showTable, setShowTable] = useState(false);

  // Calculate daily data (hourly breakdown for today)
  const dailyChartData = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Create hourly slots from 8h to 18h
    const hourlySlots = Array.from({ length: 11 }, (_, i) => ({
      time: `${(8 + i).toString().padStart(2, '0')}:00`,
      hours: 0,
      isWorking: false,
    }));

    // Find today's entries
    const todayEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.clock_in).toISOString().split('T')[0];
      return entryDate === todayStr;
    });

    // Mark working hours
    todayEntries.forEach(entry => {
      const clockIn = new Date(entry.clock_in);
      const clockOut = entry.clock_out ? new Date(entry.clock_out) : new Date();

      hourlySlots.forEach((slot, index) => {
        const slotHour = 8 + index;
        const slotStart = new Date(now);
        slotStart.setHours(slotHour, 0, 0, 0);
        const slotEnd = new Date(now);
        slotEnd.setHours(slotHour + 1, 0, 0, 0);

        // Check if this hour overlaps with the work period
        if (clockIn < slotEnd && clockOut > slotStart) {
          const overlapStart = Math.max(clockIn.getTime(), slotStart.getTime());
          const overlapEnd = Math.min(clockOut.getTime(), slotEnd.getTime());
          const overlapHours = (overlapEnd - overlapStart) / (1000 * 60 * 60);
          slot.hours = Math.round(overlapHours * 10) / 10;
          slot.isWorking = slot.hours > 0;
        }
      });
    });

    return hourlySlots;
  }, [timeEntries]);

  // Calculate weekly data (Mon-Fri only, no weekends)
  const weeklyChartData = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Find the Monday of current week
    const monday = new Date(now);
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    monday.setDate(now.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);

    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];

    // Create data for Mon-Fri only
    return weekDays.map((dayName, index) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + index);
      const dateStr = dayDate.toISOString().split('T')[0];

      const dayEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.clock_in).toISOString().split('T')[0];
        return entryDate === dateStr;
      });

      const totalHoursForDay = dayEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);

      return {
        day: dayName,
        hours: Math.round(totalHoursForDay * 10) / 10,
        date: dateStr,
      };
    });
  }, [timeEntries]);

  // Select chart data based on mode
  const chartData = mode === "daily" ? dailyChartData : weeklyChartData;

  // Calculate total and average (weekly only, excluding weekends)
  const totalHours = weeklyChartData.reduce((acc, cur) => acc + cur.hours, 0);
  const workDaysWithData = weeklyChartData.filter(d => d.hours > 0).length;
  const averageHours = workDaysWithData > 0 ? (totalHours / workDaysWithData).toFixed(1) : "0.0";

  // Load tasks for selected teammate when drawer opens
  useEffect(() => {
    const loadMateTasks = async () => {
      if (!selectedMate || !drawerOpen) {
        setSelectedMateTasks([]);
        return;
      }
      setLoadingMateTasks(true);
      try {
        const res = await fetchWithAuth(`${API_URL}/api/users/tasks/`);
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          // Filter tasks assigned to or created by the selected teammate
          const mateTasks = data.filter((task: any) =>
            task.assigned_to === selectedMate.id || task.created_by === selectedMate.id
          );
          setSelectedMateTasks(mateTasks);
        }
      } catch {
        setSelectedMateTasks([]);
      } finally {
        setLoadingMateTasks(false);
      }
    };
    loadMateTasks();
  }, [selectedMate, drawerOpen, API_URL]);

  // Add task to selected colleague
  const handleAddTaskToMate = async () => {
    if (!quickTask.trim() || !selectedMate) return;
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/users/tasks/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: quickTask,
          priority: taskPriority,
          estimated_duration: 1,
          assigned_to: selectedMate.id,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setSelectedMateTasks((prev) => [created, ...prev]);
        setTasks((prev) => [created, ...prev]);
        setQuickTask("");
        setTaskPriority("medium"); // Reset priority
      }
    } catch {
      // Failed to add task
    }
  };

  // Drawer form states
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [quickTask, setQuickTask] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");

  // Task detail modal
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskType | null>(null);
  const [showArchivedTasks, setShowArchivedTasks] = useState(false);

  // Update task progress
  const handleUpdateProgress = async (taskId: number, newProgress: number) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/users/tasks/${taskId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ progress: newProgress }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
        setSelectedMateTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
        if (selectedTask?.id === taskId) {
          setSelectedTask(updated);
        }
      }
    } catch {
      // Failed to update
    }
  };

  // Complete/Archive task (set progress to 100)
  const handleCompleteTask = async (taskId: number) => {
    await handleUpdateProgress(taskId, 100);
    setTaskDetailOpen(false);
  };

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
            <XAxis dataKey={mode === "daily" ? "time" : "day"} stroke="#cbd5e1" />
            <YAxis
              stroke="#cbd5e1"
              domain={mode === "daily" ? [0, 1] : [0, 'auto']}
              tickFormatter={(value) => mode === "daily" ? `${value}h` : value}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e3a8a",
                border: "none",
                color: "white",
              }}
              formatter={(value: number) => [`${value}h`, mode === "daily" ? "Time worked" : "Hours"]}
              labelFormatter={(label) => mode === "daily" ? `Slot: ${label}` : label}
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

        {/* Hours summary - centered with button */}
        <div className="flex flex-col items-center mt-8 gap-6">
          <div className="flex gap-6">
            <div className="bg-slate-800/60 p-4 rounded-xl text-center min-w-[140px]">
              <h3 className="text-lg font-semibold">Total Hours</h3>
              <p className="text-2xl font-bold text-cyan-400">{totalHours}h</p>
            </div>
            <div className="bg-slate-800/60 p-4 rounded-xl text-center min-w-[140px]">
              <h3 className="text-lg font-semibold">Average</h3>
              <p className="text-2xl font-bold text-cyan-400">{averageHours}h</p>
            </div>
          </div>

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
        {/* Team Header */}
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-bold">my team</h2>
          {teamName && (
            <span className="px-3 py-1 bg-cyan-400/20 text-cyan-400 rounded-full text-sm font-medium">
              {teamName}
            </span>
          )}
        </div>

        {!teamName && !teamManager && team.length === 0 ? (
          <div className="text-slate-300 text-center py-8">
            <p>You are not assigned to a team yet.</p>
            <p className="text-sm text-slate-400 mt-2">Ask an admin to assign you to a team.</p>
          </div>
        ) : (
          <>
            {/* Manager Section */}
            {teamManager && (
              <div className="mb-6">
                <div className="text-xs uppercase text-slate-400 mb-2">Manager</div>
                <button
                  onClick={() => {
                    setSelectedMate(teamManager);
                    setDrawerOpen(true);
                  }}
                  className="flex justify-between items-center bg-gradient-to-r from-yellow-500/20 to-amber-500/10 px-4 py-3 rounded-xl hover:from-yellow-500/30 hover:to-amber-500/20 border border-yellow-500/30 hover:border-yellow-400 text-white w-full md:w-auto md:min-w-[300px] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-slate-900 font-bold">
                      {teamManager.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{teamManager.full_name}</div>
                      <div className="text-xs text-yellow-300/70">Manager</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${teamManager.today_status === "pto"
                        ? "bg-yellow-400"
                        : teamManager.today_status === "late"
                          ? "bg-red-500"
                          : teamManager.is_clocked_in
                            ? "bg-green-500"
                            : "bg-slate-400"
                        }`}
                    />
                    <span className="text-xs text-slate-300">
                      {teamManager.is_clocked_in ? "Online" : "Offline"}
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* Collaborators Section */}
            {team.length > 0 && (
              <div>
                <div className="text-xs uppercase text-slate-400 mb-3">
                  Collaborators ({team.length})
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {team.map((tm) => (
                    <button
                      key={`tm-${tm.id}`}
                      onClick={() => {
                        setSelectedMate(tm);
                        setDrawerOpen(true);
                      }}
                      className="flex justify-between items-center bg-slate-800/60 px-4 py-3 rounded-xl hover:bg-slate-700 border border-slate-600 hover:border-cyan-400 text-white w-full transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-slate-300 font-semibold">
                          {tm.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-sm">{tm.full_name}</div>
                          <div className="text-xs text-slate-400 capitalize">{tm.role}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                        <span className="text-xs text-slate-400">
                          {tm.today_status === "pto"
                            ? "PTO"
                            : tm.is_clocked_in
                              ? "Online"
                              : "Offline"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Status Legend */}
            <div className="flex gap-4 mt-6 text-xs text-slate-400 justify-center">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span>Online</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Offline</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span>PTO</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tasks Section */}
      <div className="bg-[#0F2658] rounded-2xl shadow-lg p-6 w-[90%] max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">project tasks overview</h2>
          <button
            onClick={() => setShowTaskModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-900 font-semibold shadow-lg hover:shadow-cyan-400/25 hover:scale-105 transition-all duration-200"
          >
            <Plus size={20} aria-hidden="true" />
            <span>Create Task</span>
          </button>
        </div>

        {(() => {
          // Filter out completed tasks (progress === 100)
          const activeTasks = tasks.filter((t) => t.progress < 100);

          if (activeTasks.length === 0) {
            return (
              <div className="text-center text-slate-400 py-8">
                No active tasks. Click "Create Task" to add a new task!
              </div>
            );
          }

          return (
            <div className="grid md:grid-cols-3 gap-6">
              {activeTasks.map((t: TaskType) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTask(t);
                    setTaskDetailOpen(true);
                  }}
                  className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 hover:border-cyan-400 transition text-left w-full"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm flex-1">{t.title}</h4>
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
                  </div>
                  <div className="text-xs text-cyan-400 mb-1">
                    Created by: {t.created_by_name || "Me"}
                  </div>
                  <div className="text-xs text-slate-400 mb-2">
                    Assigned to: {t.assigned_to_name || "Me"}
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-2 bg-cyan-400" style={{ width: `${t.progress}%` }} />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-slate-400">
                    <span>{t.progress}% done</span>
                    {t.due_date && <span>Due {new Date(t.due_date).toLocaleDateString()}</span>}
                  </div>
                </button>
              ))}
            </div>
          );
        })()}

        {/* Archived Tasks Toggle */}
        {(() => {
          const completedTasks = tasks.filter((t) => t.progress === 100);
          if (completedTasks.length === 0) return null;

          return (
            <div className="mt-8">
              <button
                onClick={() => setShowArchivedTasks(!showArchivedTasks)}
                className="text-sm text-slate-400 hover:text-white transition flex items-center gap-2"
              >
                <span>{showArchivedTasks ? "▼" : "▶"}</span>
                <span>Archived Tasks ({completedTasks.length})</span>
              </button>

              {showArchivedTasks && (
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  {completedTasks.map((t: TaskType) => (
                    <div
                      key={t.id}
                      className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm flex-1 line-through text-slate-400">{t.title}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/80">
                          Complete
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mb-3">
                        Created by: {t.created_by_name || "Me"}
                      </div>
                      <button
                        onClick={() => handleUpdateProgress(t.id, 0)}
                        className="w-full text-xs px-3 py-2 rounded-lg bg-cyan-400/20 text-cyan-400 hover:bg-cyan-400/30 transition"
                      >
                        ↩ Restore to Active
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Assigned to Me Section - Tasks assigned by others */}
      {(() => {
        const assignedToMe = tasks.filter(
          (t) => t.assigned_to === user?.id && t.created_by !== user?.id
        );
        if (assignedToMe.length === 0) return null;
        return (
          <div className="bg-[#0F2658] rounded-2xl shadow-lg p-6 w-[90%] max-w-6xl mt-10">
            <h2 className="text-xl font-bold mb-6">tasks assigned to me</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {assignedToMe.map((t: TaskType) => (
                <div
                  key={t.id}
                  className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 hover:border-cyan-400 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm flex-1">{t.title}</h4>
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
                  </div>
                  <div className="text-xs text-cyan-400 mb-2">
                    Assigned by: {t.created_by_name || "Unknown"}
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
          </div>
        );
      })()}

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
            <div className="p-6 border-b border-white/10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-slate-900 font-bold text-xl">
                    {selectedMate?.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{selectedMate?.full_name}</div>
                    <div className="text-slate-400 text-sm capitalize">{selectedMate?.role}</div>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600"
                  aria-label="Close details"
                >
                  ✕
                </button>
              </div>

              {/* Status Badge */}
              <div className="mt-4 flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${selectedMate?.today_status === "pto"
                    ? "bg-yellow-400"
                    : selectedMate?.today_status === "late"
                      ? "bg-red-500"
                      : selectedMate?.is_clocked_in
                        ? "bg-green-500"
                        : "bg-slate-400"
                    }`}
                />
                <span className="text-sm">
                  {selectedMate?.today_status === "pto"
                    ? "On PTO today"
                    : selectedMate?.today_status === "late"
                      ? "Arrived late today"
                      : selectedMate?.is_clocked_in
                        ? "Currently online"
                        : "Currently offline"}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Start Chat Button */}
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  navigate(`/chat?userId=${selectedMate?.id}`);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-900 font-semibold hover:shadow-lg hover:shadow-cyan-400/20 transition flex items-center justify-center gap-2"
              >
                💬 Start Chat with {selectedMate?.full_name?.split(" ")[0]}
              </button>

              {/* Add Task Section */}
              <div>
                <h3 className="text-sm mb-3 text-slate-300 font-medium">Assign a task</h3>
                <div className="space-y-3">
                  <Input
                    id="quick-task"
                    label="Title"
                    value={quickTask}
                    onChange={setQuickTask}
                    placeholder="Task title..."
                  />
                  <div>
                    <label htmlFor="task-priority-drawer" className="block text-sm text-slate-300 mb-1">
                      Priority
                    </label>
                    <select
                      id="task-priority-drawer"
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as "low" | "medium" | "high")}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <Button
                    className="w-full rounded-xl bg-emerald-400 text-slate-900 border-none hover:bg-emerald-300"
                    onClick={handleAddTaskToMate}
                    disabled={!quickTask.trim()}
                  >
                    Add Task
                  </Button>
                </div>
              </div>

              {/* Colleague's Tasks */}
              <div>
                <h3 className="text-sm mb-3 text-slate-300 font-medium">
                  {selectedMate?.full_name}'s Tasks ({selectedMateTasks.length})
                </h3>
                {loadingMateTasks ? (
                  <div className="text-center text-slate-400 py-4">Loading tasks...</div>
                ) : selectedMateTasks.length === 0 ? (
                  <div className="text-center text-slate-400 py-4">No tasks assigned yet</div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {selectedMateTasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-slate-800/60 rounded-xl px-3 py-2 border border-slate-700"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">{task.title}</div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full capitalize ${task.priority === "high"
                              ? "bg-red-500/80"
                              : task.priority === "medium"
                                ? "bg-yellow-500/80"
                                : "bg-green-500/80"
                              }`}
                          >
                            {task.priority}
                          </span>
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-slate-400">
                          <span>{task.progress}% done</span>
                          <span>{task.estimated_duration}h</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Book Meeting */}
              <div className="border-t border-white/10 pt-6">
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

              {/* Start a Chat */}
              <div className="border-t border-white/10 pt-6">
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

      {/* Task Detail Modal */}
      <Modal
        isOpen={taskDetailOpen}
        onClose={() => setTaskDetailOpen(false)}
        title="Task Details"
      >
        {selectedTask && (
          <div className="space-y-6">
            {/* Task Header */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">{selectedTask.title}</h3>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full capitalize ${selectedTask.priority === "high"
                    ? "bg-red-500/80"
                    : selectedTask.priority === "medium"
                      ? "bg-yellow-500/80"
                      : "bg-green-500/80"
                    }`}
                >
                  {selectedTask.priority} priority
                </span>
              </div>
            </div>

            {/* Task Info */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Created by:</span>
                <span className="text-cyan-400">{selectedTask.created_by_name || "Me"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned to:</span>
                <span className="text-white">{selectedTask.assigned_to_name || "Me"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Duration:</span>
                <span className="text-white">{selectedTask.estimated_duration}h</span>
              </div>
              {selectedTask.due_date && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Due date:</span>
                  <span className="text-white">{new Date(selectedTask.due_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Progress Section */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-300">Progress</span>
                <span className="text-sm text-cyan-400">{selectedTask.progress}%</span>
              </div>
              <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden mb-4">
                <div className="h-3 bg-cyan-400 transition-all" style={{ width: `${selectedTask.progress}%` }} />
              </div>

              {/* Progress Buttons */}
              <div className="flex gap-2 justify-center">
                {[0, 25, 50, 75, 100].map((progress) => (
                  <button
                    key={progress}
                    onClick={() => handleUpdateProgress(selectedTask.id, progress)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${selectedTask.progress === progress
                      ? "bg-cyan-400 text-slate-900"
                      : "bg-slate-700 text-white hover:bg-slate-600"
                      }`}
                  >
                    {progress}%
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-700">
              <Button
                onClick={() => handleCompleteTask(selectedTask.id)}
                className="flex-1 bg-green-500 hover:bg-green-400 text-white border-none"
              >
                ✓ Mark Complete
              </Button>
              <Button
                onClick={() => {
                  handleDeleteTask(selectedTask.id);
                  setTaskDetailOpen(false);
                }}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50"
              >
                Delete Task
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
