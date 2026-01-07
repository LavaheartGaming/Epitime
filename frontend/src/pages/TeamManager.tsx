import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Clock, Shield, Plus, Save, RefreshCcw, Edit2, Trash2, ListTodo, X } from "lucide-react";

type TeamMember = {
  id: number;
  full_name: string;
  email: string;
  role: "user" | "manager" | "admin";
  manager_id: number | null;
  manager_name: string | null;
  is_clocked_in: boolean;
  open_clock_in: string | null;
  today_status: "normal" | "late" | "pto";
  today_status_note: string;
};

type TimeEntry = {
  id: number;
  clock_in: string;
  clock_out: string | null;
  total_hours: number | null;
};

type Task = {
  id: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimated_duration: number;
  progress: number;
  due_date: string | null;
  assigned_to: number;
  assigned_to_name: string;
  created_by_name: string;
};

export default function TeamManagerPage() {
  const { user } = useAuth();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  // ---- Hooks first (never return before these) ----
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [tab, setTab] = useState<"teams" | "users" | "team" | "history" | "admin" | "tasks">("teams");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // status editor
  const [status, setStatus] = useState<"normal" | "late" | "pto">("normal");
  const [statusNote, setStatusNote] = useState("");

  // time editor
  const [entryId, setEntryId] = useState<number | "new">("new");
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");

  // admin assignment
  const [assignUserId, setAssignUserId] = useState<number | "">("");
  const [assignManagerId, setAssignManagerId] = useState<number | "">("");

  // tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    priority: "medium" as "low" | "medium" | "high",
    estimated_duration: 1,
    due_date: "",
    assigned_to: 0,
  });

  const canAccess = !!user && ["manager", "admin"].includes(user.role);

  const fetchWithAuth = async (url: string, method = "GET", body?: any) => {
    const token = localStorage.getItem("access_token");
    const headers: any = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const options: any = { method, headers };
    if (body !== undefined) options.body = JSON.stringify(body);
    return fetch(url, options);
  };

  const managersList = useMemo(() => {
    // Admins can assign to managers or admins (up to you)
    return members.filter((m) => m.role === "manager" || m.role === "admin");
  }, [members]);

  const usersList = useMemo(() => {
    // Only regular users should be assigned to managers
    return members.filter((m) => m.role === "user");
  }, [members]);

  // Group members by their manager for teams overview
  const teamsByManager = useMemo(() => {
    const teams: { [key: string]: { manager: TeamMember | null; members: TeamMember[] } } = {};

    // Get all managers
    const managers = members.filter(m => m.role === "manager");

    // Initialize teams for each manager
    managers.forEach(manager => {
      teams[manager.id] = { manager, members: [] };
    });

    // Add unassigned team
    teams['unassigned'] = { manager: null, members: [] };

    // Assign users to their teams
    members.filter(m => m.role === "user").forEach(member => {
      if (member.manager_id && teams[member.manager_id]) {
        teams[member.manager_id].members.push(member);
      } else {
        teams['unassigned'].members.push(member);
      }
    });

    return teams;
  }, [members]);

  const loadMembers = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/team/members/`);
      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.error || "❌ Failed to load members.");
        setMembers([]);
        return;
      }

      const list: TeamMember[] = Array.isArray(data) ? data : [];
      setMembers(list);

      // Keep selection valid
      if (selected) {
        const fresh = list.find((x) => x.id === selected.id) || null;
        setSelected(fresh);
        if (fresh) {
          setStatus(fresh.today_status);
          setStatusNote(fresh.today_status_note || "");
        }
      }
    } catch {
      setMsg("⚠️ Server unreachable.");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (memberId: number) => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetchWithAuth(
        `${API_URL}/api/users/team/members/${memberId}/time-entries/`
      );
      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.error || "❌ Failed to load history.");
        setEntries([]);
        return;
      }

      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setMsg("⚠️ Server unreachable.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const selectMember = (m: TeamMember) => {
    setSelected(m);
    setTab("team");
    setEntries([]);
    setEntryId("new");
    setClockIn("");
    setClockOut("");

    setStatus(m.today_status);
    setStatusNote(m.today_status_note || "");
  };

  const saveStatus = async () => {
    if (!selected) return;
    setMsg("");
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/team/status/`, "POST", {
        user_id: selected.id,
        status,
        note: statusNote,
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error || "❌ Failed to update status.");
        return;
      }
      setMsg("✅ Status updated.");
      await loadMembers();
    } catch {
      setMsg("⚠️ Server unreachable.");
    }
  };

  const saveTimeEntry = async () => {
    if (!selected) return;
    if (!clockIn) {
      setMsg("❌ clock_in is required.");
      return;
    }

    setMsg("");
    const payload: any = {
      user_id: selected.id,
      clock_in: new Date(clockIn).toISOString(),
      clock_out: clockOut ? new Date(clockOut).toISOString() : null,
    };
    if (entryId !== "new") payload.entry_id = entryId;

    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/team/time-entry/`, "POST", payload);
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error || "❌ Failed to save time entry.");
        return;
      }
      setMsg("✅ Time entry saved.");
      await loadHistory(selected.id);
      await loadMembers();
      setEntryId("new");
      setClockIn("");
      setClockOut("");
    } catch {
      setMsg("⚠️ Server unreachable.");
    }
  };

  const adminAssignManager = async () => {
    if (!user || user.role !== "admin") return;
    if (!assignUserId) return setMsg("❌ Select a user.");

    setMsg("");

    // empty string means "remove manager"
    const managerVal = assignManagerId === "" ? null : assignManagerId;

    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/team/assign-manager/`, "PUT", {
        user_id: assignUserId,
        manager_id: managerVal,
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error || "❌ Failed to update assignment.");
        return;
      }
      setMsg(data?.message || "✅ Assignment updated.");
      setAssignUserId("");
      setAssignManagerId("");
      await loadMembers();
    } catch {
      setMsg("⚠️ Server unreachable.");
    }
  };

  // Task management functions
  const loadTasks = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/tasks/`);
      const data = await res.json();
      if (res.ok) {
        setTasks(Array.isArray(data) ? data : []);
      } else {
        setMsg(data?.error || "❌ Failed to load tasks.");
        setTasks([]);
      }
    } catch {
      setMsg("⚠️ Server unreachable.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const createOrUpdateTask = async () => {
    if (!newTask.title.trim()) {
      setMsg("❌ Title is required.");
      return;
    }

    setMsg("");
    const payload = {
      title: newTask.title,
      priority: newTask.priority,
      estimated_duration: newTask.estimated_duration,
      due_date: newTask.due_date || null,
      assigned_to: newTask.assigned_to || (selected?.id || user?.id),
    };

    try {
      const url = editingTask
        ? `${API_URL}/api/users/tasks/${editingTask.id}/`
        : `${API_URL}/api/users/tasks/`;
      const method = editingTask ? "PUT" : "POST";

      const res = await fetchWithAuth(url, method, payload);
      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.error || `❌ Failed to ${editingTask ? "update" : "create"} task.`);
        return;
      }

      setMsg(`✅ Task ${editingTask ? "updated" : "created"} successfully.`);
      setShowTaskModal(false);
      setEditingTask(null);
      setNewTask({ title: "", priority: "medium", estimated_duration: 1, due_date: "", assigned_to: 0 });
      await loadTasks();
    } catch {
      setMsg("⚠️ Server unreachable.");
    }
  };

  const deleteTask = async (taskId: number) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    setMsg("");
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/tasks/${taskId}/`, "DELETE");
      if (res.ok) {
        setMsg("✅ Task deleted.");
        await loadTasks();
      } else {
        const data = await res.json();
        setMsg(data?.error || "❌ Failed to delete task.");
      }
    } catch {
      setMsg("⚠️ Server unreachable.");
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      priority: task.priority,
      estimated_duration: task.estimated_duration,
      due_date: task.due_date ? task.due_date.slice(0, 16) : "",
      assigned_to: task.assigned_to,
    });
    setShowTaskModal(true);
  };

  // Team management functions
  const assignUserToManager = async (userId: number, managerId: number | null) => {
    setMsg("");
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/team/assign-manager/`, "PUT", {
        user_id: userId,
        manager_id: managerId,
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error || "❌ Failed to assign user.");
        return;
      }
      setMsg(data?.message || "✅ User assigned successfully.");
      await loadMembers();
    } catch {
      setMsg("⚠️ Server unreachable.");
    }
  };

  const removeUserFromTeam = async (userId: number) => {
    if (!window.confirm("Remove this user from the team?")) return;
    await assignUserToManager(userId, null);
  };

  const statusBadgeClass = (s: TeamMember["today_status"]) => {
    if (s === "late") return "bg-red-500/20 border-red-400 text-red-200";
    if (s === "pto") return "bg-yellow-500/20 border-yellow-300 text-yellow-100";
    return "bg-emerald-500/20 border-emerald-300 text-emerald-100";
  };

  // ✅ Effects (never conditional hook; conditional logic inside)
  useEffect(() => {
    if (!canAccess) return;
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess]);

  // ✅ Auth gating after hooks
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccess) return <Navigate to="/home" replace />;

  const isAdmin = user.role === "admin";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-blue-900 to-indigo-900 text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <Users className="text-yellow-400" /> Team Manager
            </h1>
            <p className="text-blue-200">
              {isAdmin
                ? "Admin: see all users and create teams by assigning them to managers."
                : "Manager: see your team and manage attendance."}
            </p>
          </div>

          <button
            onClick={loadMembers}
            className="px-4 py-2 rounded-xl bg-yellow-400 text-gray-900 font-semibold hover:bg-yellow-300 flex items-center gap-2"
          >
            <RefreshCcw size={16} /> Refresh
          </button>
        </div>

        {msg && (
          <div className="mb-6 bg-blue-800/60 border border-yellow-400 rounded-xl px-4 py-3 font-semibold">
            {msg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left panel: list */}
          <div className="bg-blue-950/50 border border-blue-800 rounded-2xl p-4">
            {/* Navigation buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setTab("teams"); setSelected(null); }}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm ${tab === "teams" ? "bg-yellow-400 text-gray-900" : "bg-blue-900/40 hover:bg-blue-800/60"
                  }`}
              >
                Teams
              </button>
              <button
                onClick={() => { setTab("users"); setSelected(null); }}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm ${tab === "users" ? "bg-yellow-400 text-gray-900" : "bg-blue-900/40 hover:bg-blue-800/60"
                  }`}
              >
                All Users
              </button>
            </div>

            <h2 className="font-bold text-yellow-400 mb-3">
              {tab === "users" ? "All Users" : "Teams"}
            </h2>

            {loading && <p className="text-blue-200 text-sm">Loading…</p>}

            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {(tab === "users" ? members : members.filter(m => m.role === "manager" || m.role === "admin")).map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelected(m);
                    setStatus(m.today_status);
                    setStatusNote(m.today_status_note || "");
                    // Only switch to team tab if we're in teams mode
                    if (tab === "teams") {
                      setTab("team");
                    } else if (tab === "users") {
                      // In users mode, activate team tab to show profile
                      setTab("team");
                    }
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition ${selected?.id === m.id
                    ? "bg-blue-800/60 border-yellow-400"
                    : "bg-blue-900/30 border-blue-800 hover:bg-blue-800/40"
                    }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {m.full_name}{" "}
                        <span className="text-xs text-blue-300">({m.role})</span>
                      </div>
                      <div className="text-xs text-blue-200 truncate">{m.email}</div>
                      {isAdmin && (
                        <div className="text-xs text-blue-300 mt-1">
                          Manager: {m.manager_name || "—"}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-xs px-2 py-1 rounded-full border inline-block ${statusBadgeClass(
                          m.today_status
                        )}`}
                      >
                        {m.today_status.toUpperCase()}
                      </div>
                      <div className="mt-1 text-xs">
                        {m.is_clocked_in ? (
                          <span className="text-emerald-300">● Clocked in</span>
                        ) : (
                          <span className="text-slate-300">○ Clocked out</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {members.length === 0 && !loading && (
                <div className="text-blue-200 text-sm">No members found.</div>
              )}
            </div>
          </div>

          {/* Right panel: details or teams overview */}
          <div className="md:col-span-2 bg-blue-950/50 border border-blue-800 rounded-2xl p-6">
            {tab === "teams" && !selected ? (
              <div>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Users className="text-yellow-400" /> Teams Overview
                </h2>

                {loading && <p className="text-blue-200">Loading teams...</p>}

                {!loading && Object.keys(teamsByManager).length === 0 && (
                  <div className="text-center text-blue-200 py-8">
                    No teams found.
                  </div>
                )}

                {!loading && Object.keys(teamsByManager).length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(teamsByManager).map(([key, team]) => {
                      if (key === 'unassigned' && team.members.length === 0) return null;

                      return (
                        <div
                          key={key}
                          className="bg-blue-900/30 border border-blue-800 rounded-2xl p-4 hover:border-yellow-400 transition cursor-pointer"
                          onClick={() => {
                            if (team.manager) {
                              selectMember(team.manager);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-lg">
                              {team.manager ? team.manager.full_name : "Unassigned"}
                            </h3>
                            <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-200">
                              {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
                            </span>
                          </div>

                          {team.manager && (
                            <div className="text-xs text-blue-300 mb-3">
                              {team.manager.email}
                            </div>
                          )}

                          <div className="space-y-1">
                            {team.members.slice(0, 3).map(member => (
                              <div key={member.id} className="text-sm text-blue-200 flex items-center gap-2">
                                <span className={member.is_clocked_in ? "text-emerald-400" : "text-slate-400"}>
                                  {member.is_clocked_in ? "●" : "○"}
                                </span>
                                {member.full_name}
                              </div>
                            ))}
                            {team.members.length > 3 && (
                              <div className="text-xs text-blue-400">
                                +{team.members.length - 3} more...
                              </div>
                            )}
                          </div>

                          <div className="mt-3 pt-3 border-t border-blue-800 flex justify-between text-xs text-blue-300">
                            <span>Active: {team.members.filter(m => m.is_clocked_in).length}</span>
                            <span>Status: {team.members.filter(m => m.today_status === "normal").length} OK</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : !selected ? (
              <div className="text-center text-blue-200 py-8">
                <Users className="mx-auto mb-4 text-blue-400" size={48} />
                <p className="text-lg font-semibold">Select a user to view their profile</p>
                <p className="text-sm mt-2">Click on any user from the list to see their details, history, and tasks.</p>
              </div>
            ) : (
              <>
                {/* Top header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">{selected.full_name}</h2>
                    <p className="text-blue-200 text-sm">{selected.email}</p>
                    {isAdmin && (
                      <p className="text-blue-300 text-xs mt-1">
                        Role: {selected.role} — Manager: {selected.manager_name || "—"}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setTab("team")}
                      className={`px-4 py-2 rounded-xl font-semibold ${tab === "team" ? "bg-yellow-400 text-gray-900" : "bg-blue-900/40"
                        }`}
                    >
                      Team
                    </button>

                    <button
                      onClick={async () => {
                        setTab("history");
                        await loadHistory(selected.id);
                      }}
                      className={`px-4 py-2 rounded-xl font-semibold ${tab === "history" ? "bg-yellow-400 text-gray-900" : "bg-blue-900/40"
                        }`}
                    >
                      History
                    </button>

                    <button
                      onClick={async () => {
                        setTab("tasks");
                        await loadTasks();
                      }}
                      className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 ${tab === "tasks" ? "bg-yellow-400 text-gray-900" : "bg-blue-900/40"
                        }`}
                    >
                      <ListTodo size={16} /> Tasks
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => setTab("admin")}
                        className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 ${tab === "admin" ? "bg-yellow-400 text-gray-900" : "bg-blue-900/40"
                          }`}
                      >
                        <Shield size={16} /> Admin
                      </button>
                    )}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {/* TEAM TAB */}
                  {tab === "team" && (
                    <motion.div
                      key="team"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-6"
                    >
                      {/* Status */}
                      <div className="bg-blue-900/30 border border-blue-800 rounded-2xl p-4">
                        <h3 className="font-bold flex items-center gap-2 mb-3">
                          <Clock className="text-cyan-400" /> Today status
                        </h3>

                        <div className="flex flex-wrap gap-2">
                          {(["normal", "late", "pto"] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => setStatus(s)}
                              className={`px-4 py-2 rounded-xl border font-semibold ${status === s
                                ? "bg-yellow-400 text-gray-900 border-yellow-300"
                                : "bg-blue-900/40 border-blue-800 hover:bg-blue-800/40"
                                }`}
                            >
                              {s.toUpperCase()}
                            </button>
                          ))}
                        </div>

                        <input
                          value={statusNote}
                          onChange={(e) => setStatusNote(e.target.value)}
                          placeholder="Optional note (traffic, sick leave...)"
                          className="mt-3 w-full bg-blue-900/40 border border-blue-800 rounded-xl px-4 py-2"
                        />

                        <button
                          onClick={saveStatus}
                          className="mt-3 px-4 py-2 rounded-xl bg-emerald-400 text-gray-900 font-semibold hover:bg-emerald-300 flex items-center gap-2"
                        >
                          <Save size={16} /> Save status
                        </button>
                      </div>

                      {/* Live session info */}
                      <div className="bg-blue-900/30 border border-blue-800 rounded-2xl p-4">
                        <h3 className="font-bold mb-2">Live session</h3>
                        {selected.is_clocked_in ? (
                          <p className="text-emerald-200">
                            Clocked in since{" "}
                            <span className="font-semibold">
                              {selected.open_clock_in
                                ? new Date(selected.open_clock_in).toLocaleString()
                                : "—"}
                            </span>
                          </p>
                        ) : (
                          <p className="text-slate-200">No open session (clocked out).</p>
                        )}
                      </div>

                      {/* Team Assignment - Only for regular users */}
                      {selected.role === "user" && (
                        <div className="bg-blue-900/30 border border-blue-800 rounded-2xl p-4">
                          <h3 className="font-bold mb-3">Team Assignment</h3>
                          <div className="flex gap-2">
                            <select
                              onChange={(e) => {
                                const managerId = Number(e.target.value);
                                if (managerId) {
                                  assignUserToManager(selected.id, managerId);
                                }
                              }}
                              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                              value={selected.manager_id || ""}
                            >
                              <option value="">No Manager</option>
                              {members.filter(m => m.role === "manager").map(manager => (
                                <option key={manager.id} value={manager.id}>
                                  {manager.full_name}
                                </option>
                              ))}
                            </select>
                            {selected.manager_id && (
                              <button
                                onClick={() => removeUserFromTeam(selected.id)}
                                className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500 text-red-200 hover:bg-red-500/30"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          {selected.manager_name && (
                            <p className="text-sm text-blue-200 mt-2">
                              Currently assigned to: {selected.manager_name}
                            </p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* HISTORY TAB */}
                  {tab === "history" && (
                    <motion.div
                      key="history"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-6"
                    >
                      <div className="bg-blue-900/30 border border-blue-800 rounded-2xl p-4">
                        <h3 className="font-bold mb-3 flex items-center gap-2">
                          <Plus className="text-yellow-400" /> Assign / fix clock-in & clock-out
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <select
                            value={entryId}
                            onChange={(e) =>
                              setEntryId(e.target.value === "new" ? "new" : Number(e.target.value))
                            }
                            className="bg-blue-900/40 border border-blue-800 rounded-xl px-3 py-2"
                          >
                            <option value="new">New entry</option>
                            {entries.map((en) => (
                              <option key={en.id} value={en.id}>
                                #{en.id} — {new Date(en.clock_in).toLocaleString()}
                              </option>
                            ))}
                          </select>

                          <input
                            type="datetime-local"
                            value={clockIn}
                            onChange={(e) => setClockIn(e.target.value)}
                            className="bg-blue-900/40 border border-blue-800 rounded-xl px-3 py-2"
                          />
                          <input
                            type="datetime-local"
                            value={clockOut}
                            onChange={(e) => setClockOut(e.target.value)}
                            className="bg-blue-900/40 border border-blue-800 rounded-xl px-3 py-2"
                          />
                        </div>

                        <button
                          onClick={saveTimeEntry}
                          className="mt-3 px-4 py-2 rounded-xl bg-yellow-400 text-gray-900 font-semibold hover:bg-yellow-300"
                        >
                          Save time entry
                        </button>
                      </div>

                      <div className="bg-blue-900/30 border border-blue-800 rounded-2xl p-4">
                        <h3 className="font-bold mb-3">Clock history</h3>

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left border-collapse">
                            <thead>
                              <tr className="text-slate-300 border-b border-blue-800">
                                <th className="py-2">Clock In</th>
                                <th className="py-2">Clock Out</th>
                                <th className="py-2">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {entries.map((en) => (
                                <tr key={en.id} className="border-b border-blue-900/60">
                                  <td className="py-2 text-emerald-200">
                                    {new Date(en.clock_in).toLocaleString()}
                                  </td>
                                  <td className="py-2 text-red-200">
                                    {en.clock_out ? new Date(en.clock_out).toLocaleString() : "— (open)"}
                                  </td>
                                  <td className="py-2 text-cyan-200">
                                    {en.total_hours != null ? `${en.total_hours}h` : "—"}
                                  </td>
                                </tr>
                              ))}

                              {entries.length === 0 && (
                                <tr>
                                  <td className="py-3 text-blue-200" colSpan={3}>
                                    No entries found.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ADMIN TAB */}
                  {tab === "admin" && isAdmin && (
                    <motion.div
                      key="admin"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-6"
                    >
                      <div className="bg-blue-900/30 border border-blue-800 rounded-2xl p-4">
                        <h3 className="font-bold mb-3 flex items-center gap-2">
                          <Shield className="text-yellow-400" /> Create teams (assign users to managers)
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <select
                            value={assignUserId}
                            onChange={(e) => setAssignUserId(e.target.value ? Number(e.target.value) : "")}
                            className="bg-blue-900/40 border border-blue-800 rounded-xl px-3 py-2"
                          >
                            <option value="">Select a USER</option>
                            {usersList.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.full_name} ({u.email}) — manager: {u.manager_name || "—"}
                              </option>
                            ))}
                          </select>

                          <select
                            value={assignManagerId}
                            onChange={(e) => setAssignManagerId(e.target.value ? Number(e.target.value) : "")}
                            className="bg-blue-900/40 border border-blue-800 rounded-xl px-3 py-2"
                          >
                            <option value="">(Remove manager)</option>
                            {managersList.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.full_name} ({m.role})
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={adminAssignManager}
                          className="mt-3 px-4 py-2 rounded-xl bg-emerald-400 text-gray-900 font-semibold hover:bg-emerald-300"
                        >
                          Apply assignment
                        </button>
                      </div>

                      <div className="bg-blue-900/30 border border-blue-800 rounded-2xl p-4">
                        <h3 className="font-bold mb-3">Quick overview</h3>
                        <div className="text-sm text-blue-200 space-y-1">
                          <div>Managers/Admins: {managersList.length}</div>
                          <div>Users: {usersList.length}</div>
                          <div>Total: {members.length}</div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TASKS TAB */}
                  {tab === "tasks" && (
                    <motion.div
                      key="tasks"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-6"
                    >
                      {/* Overview Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-900/30 border border-blue-800 rounded-2xl p-4">
                          <h3 className="font-bold mb-2 flex items-center gap-2">
                            <Users className="text-cyan-400" size={20} /> Team Overview
                          </h3>
                          <div className="text-sm text-blue-200 space-y-1">
                            <div>Total Members: {members.length}</div>
                            <div>Selected: {selected?.full_name || "—"}</div>
                          </div>
                        </div>

                        <div className="bg-blue-900/30 border border-blue-800 rounded-2xl p-4">
                          <h3 className="font-bold mb-2 flex items-center gap-2">
                            <ListTodo className="text-yellow-400" size={20} /> Tasks Summary
                          </h3>
                          <div className="text-sm text-blue-200 space-y-1">
                            <div>Total Tasks: {tasks.length}</div>
                            <div>In Progress: {tasks.filter(t => t.progress > 0 && t.progress < 100).length}</div>
                            <div>Completed: {tasks.filter(t => t.progress === 100).length}</div>
                          </div>
                        </div>
                      </div>

                      {/* Create Task Button */}
                      <button
                        onClick={() => {
                          setEditingTask(null);
                          setNewTask({ title: "", priority: "medium", estimated_duration: 1, due_date: "", assigned_to: selected?.id || 0 });
                          setShowTaskModal(true);
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-yellow-400 text-gray-900 font-semibold hover:bg-yellow-300 flex items-center justify-center gap-2"
                      >
                        <Plus size={20} /> Create Task
                      </button>

                      {/* Tasks Grid */}
                      {loading && <p className="text-blue-200 text-sm">Loading tasks...</p>}

                      {!loading && tasks.length === 0 && (
                        <div className="text-center text-blue-200 py-8">
                          No tasks yet. Click "Create Task" to add one!
                        </div>
                      )}

                      {!loading && tasks.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {tasks.map((task) => (
                            <div
                              key={task.id}
                              className="bg-blue-900/30 border border-blue-800 rounded-2xl p-4 hover:border-yellow-400 transition"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-lg flex-1">{task.title}</h4>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full capitalize ${task.priority === "high"
                                      ? "bg-red-500/80 text-white"
                                      : task.priority === "medium"
                                        ? "bg-yellow-500/80 text-gray-900"
                                        : "bg-green-500/80 text-white"
                                      }`}
                                  >
                                    {task.priority}
                                  </span>
                                  <button
                                    onClick={() => openEditModal(task)}
                                    className="p-1 rounded-lg hover:bg-blue-800/40 text-cyan-400"
                                    title="Edit task"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => deleteTask(task.id)}
                                    className="p-1 rounded-lg hover:bg-red-500/20 text-red-400"
                                    title="Delete task"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>

                              <div className="text-xs text-blue-200 space-y-1 mb-3">
                                <div>Assigned to: {task.assigned_to_name}</div>
                                <div>Created by: {task.created_by_name}</div>
                                <div>Duration: {task.estimated_duration}h</div>
                                {task.due_date && (
                                  <div>Deadline: {new Date(task.due_date).toLocaleString()}</div>
                                )}
                              </div>

                              {/* Progress Bar */}
                              <div className="w-full h-2 bg-blue-950 rounded-full overflow-hidden mb-2">
                                <div
                                  className="h-2 bg-cyan-400"
                                  style={{ width: `${task.progress}%` }}
                                />
                              </div>
                              <div className="text-xs text-blue-300 text-right">
                                {task.progress}% complete
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>

          {/* Task Creation/Edit Modal */}
          <AnimatePresence>
            {showTaskModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
                onClick={() => setShowTaskModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-slate-900 rounded-2xl p-6 w-[90%] max-w-md shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">
                      {editingTask ? "Edit Task" : "Create New Task"}
                    </h3>
                    <button
                      onClick={() => setShowTaskModal(false)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Title *</label>
                      <input
                        type="text"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        placeholder="Enter task title..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Priority</label>
                      <select
                        value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as "low" | "medium" | "high" })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:border-cyan-400 focus:outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Estimated Duration (hours)</label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={newTask.estimated_duration}
                        onChange={(e) => setNewTask({ ...newTask, estimated_duration: parseFloat(e.target.value) || 1 })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    {/* Deadline */}
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Deadline (Date & Time)</label>
                      <input
                        type="datetime-local"
                        value={newTask.due_date}
                        onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    {/* Assign To */}
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Assign To</label>
                      <select
                        value={newTask.assigned_to}
                        onChange={(e) => setNewTask({ ...newTask, assigned_to: Number(e.target.value) })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:border-cyan-400 focus:outline-none"
                      >
                        <option value={0}>Select a member...</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.full_name} ({m.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={createOrUpdateTask}
                      disabled={!newTask.title.trim()}
                      className="w-full mt-4 py-3 rounded-xl bg-cyan-400 text-slate-900 font-semibold hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {editingTask ? "Update Task" : "Create Task"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}