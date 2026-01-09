import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Clock, Shield, Plus, RefreshCcw,
  Trash2, X, Search, ChevronRight, UserPlus,
  Lock, BarChart, Clipboard, Calendar
} from "lucide-react";
import { Input } from "../components/Input";

type TeamMember = {
  id: number;
  full_name: string;
  email: string;
  role: "user" | "manager" | "admin";
  team_id: number | null;
  team_name: string | null;
  is_clocked_in: boolean;
  open_clock_in: string | null;
  today_status: "normal" | "late" | "pto";
  today_status_note: string;
};

type ReportEntry = {
  id: number;
  full_name: string;
  role: string;
  hours_today: number;
  hours_week: number;
  lates_month: number;
  team_name: string;
};

type TeamEntity = {
  id: number;
  name: string;
  description: string;
  members_count: number;
  managers: { id: number, full_name: string }[];
};

type TimeEntry = {
  id: number;
  clock_in: string;
  clock_out: string | null;
  duration: string | null;  // "HH:MM:SS" or computed
  is_verified: boolean;
};

type WorkingHoursEntry = {
  id?: number;
  day_of_week: number;
  day_name?: string;
  start_time: string;
  end_time: string;
  enabled: boolean;
};

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Simple reusable card component for glassmorphism effect
const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 shadow-xl ${className}`}>
    {children}
  </div>
);

export default function TeamManagerPage() {
  const { user } = useAuth();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  // Data State
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<TeamEntity[]>([]);
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // UI State
  const [viewMode, setViewMode] = useState<"grid" | "create_team" | "manage_team" | "reports">("grid");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  // Create Team Form
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");

  const [userSearchTerm, setUserSearchTerm] = useState("");

  // Admin Stats & Actions State
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [memberEntries, setMemberEntries] = useState<TimeEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  // Password Reset State
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Working Hours State
  const [workingHours, setWorkingHours] = useState<WorkingHoursEntry[]>([]);
  const [workingHoursLoading, setWorkingHoursLoading] = useState(false);
  const [showWorkingHours, setShowWorkingHours] = useState(false);

  const canAccess = !!user && ["manager", "admin"].includes(user.role);
  const isAdmin = user?.role === "admin";

  // --- API Helpers ---
  const fetchWithAuth = async (url: string, method = "GET", body?: any) => {
    const token = localStorage.getItem("access_token");
    const headers: any = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const options: any = { method, headers };
    if (body !== undefined) options.body = JSON.stringify(body);
    return fetch(url, options);
  };

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      // Load Members
      const resMembers = await fetchWithAuth(`${API_URL}/api/users/team/members/`);
      const dataMembers = await resMembers.json();
      if (!resMembers.ok) throw new Error(dataMembers?.error || "Failed to load members");
      setMembers(Array.isArray(dataMembers) ? dataMembers : []);

      // Load Teams
      // Admin sees all, Managers see their own (backend handles filtering)
      const resTeams = await fetchWithAuth(`${API_URL}/api/users/teams/`);
      const dataTeams = await resTeams.json();
      if (resTeams.ok) setTeams(dataTeams);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || "Server unreachable" });
    } finally {
      setLoading(false);
    }
  }, [API_URL, isAdmin]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/team/reports/`);
      const data = await res.json();
      if (res.ok) {
        setReports(data);
        setViewMode("reports");
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'Failed to load reports' });
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async () => {
    if (!newTeamName) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/teams/`, "POST", {
        name: newTeamName,
        description: newTeamDesc
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setMsg({ type: "success", text: "Team created!" });
      setNewTeamName("");
      setNewTeamDesc("");
      setViewMode("grid");
      loadData();
    } catch (e: any) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const assignToTeam = async (userId: number, teamId: number | null) => {
    setMsg(null);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/team/assign/`, "PUT", {
        user_id: userId,
        team_id: teamId,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to assign user");

      setMsg({ type: 'success', text: teamId ? "User assigned to team!" : "User removed from team." });
      await loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const fetchUserTimeEntries = async (userId: number) => {
    setEntriesLoading(true);
    try {
      // We'll reset entries for a clean state
      setMemberEntries([]);
      const res = await fetchWithAuth(`${API_URL}/api/users/team/members/${userId}/time-entries/`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setMemberEntries(data);
      }
    } catch (e) {
      setMsg({ type: "error", text: "Failed to load time entries" });
    } finally {
      setEntriesLoading(false);
    }
  };

  const deleteTeam = async (teamId: number) => {
    if (!window.confirm("Are you sure? This will dissolve the team.")) return;

    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/teams/${teamId}/`, "DELETE");
      if (!res.ok) throw new Error("Failed");

      setMsg({ type: "success", text: "Team dissolved successfully." });
    } catch (err) {
      setMsg({ type: "error", text: "Failed to dissolve team." });
    } finally {
      setLoading(false);
      loadData();
    }
  };

  const handleResetPassword = async () => {
    if (!selectedMember || !newPassword) return;
    setResetLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/admin/reset-password/`, "POST", {
        user_id: selectedMember.id,
        new_password: newPassword
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setMsg({ type: "success", text: `Password updated for ${selectedMember.full_name}` });
      setShowPasswordReset(false);
      setNewPassword("");
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setResetLoading(false);
    }
  };

  const fetchWorkingHours = async (userId: number) => {
    setWorkingHoursLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/team/members/${userId}/working-hours/`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        // Create full week with enabled/disabled entries
        const fullWeek: WorkingHoursEntry[] = DAY_NAMES.map((name, idx) => {
          const existing = data.find((d: any) => d.day_of_week === idx);
          return existing
            ? { ...existing, enabled: true }
            : { day_of_week: idx, day_name: name, start_time: "09:00", end_time: "17:00", enabled: false };
        });
        setWorkingHours(fullWeek);
      }
    } catch (e) {
      setMsg({ type: "error", text: "Failed to load working hours" });
    } finally {
      setWorkingHoursLoading(false);
    }
  };

  const saveWorkingHours = async () => {
    if (!selectedMember) return;
    setWorkingHoursLoading(true);
    try {
      const schedules = workingHours
        .filter(wh => wh.enabled)
        .map(wh => ({
          day_of_week: wh.day_of_week,
          start_time: wh.start_time,
          end_time: wh.end_time
        }));

      const res = await fetchWithAuth(
        `${API_URL}/api/users/team/members/${selectedMember.id}/working-hours/`,
        "PUT",
        { schedules }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setMsg({ type: "success", text: `Working hours updated for ${selectedMember.full_name}` });
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setWorkingHoursLoading(false);
    }
  };

  // --- Computed Data ---
  // Current active team data
  const currentTeam = useMemo(() => {
    if (!selectedTeamId) return null;
    return teams.find(t => t.id === selectedTeamId);
  }, [teams, selectedTeamId]);

  const currentTeamMembers = useMemo(() => {
    if (!selectedTeamId) return [];
    return members.filter(m => m.team_id === selectedTeamId);
  }, [members, selectedTeamId]);

  const unassignedManagers = useMemo(() => {
    // Managers who are not in THIS team (or any team? User request: "can assigned people".
    // Let's list all managers not currently in this team, so we can add them.)
    // actually, a manager can only be in one team (User.team FK is unique).
    return members.filter(m => (m.role === 'manager' || m.role === 'admin') && m.team_id === null);
  }, [members]);

  const unassignedUsers = useMemo(() => {
    return members.filter(m => m.team_id === null && m.role === 'user' &&
      (userSearchTerm === "" || m.full_name.toLowerCase().includes(userSearchTerm.toLowerCase()))
    );
  }, [members, userSearchTerm]);


  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess, loadData]);

  if (!user) return <Navigate to="/login" replace />;
  if (!canAccess) return <Navigate to="/home" replace />;

  const clearMsg = () => setMsg(null);

  // --- Helpers for Stats ---
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const getRecentDailyStats = () => {
    if (!memberEntries.length) return [];

    // Group by date (YYYY-MM-DD)
    const days: Record<string, number> = {};
    memberEntries.forEach(e => {
      if (!e.clock_out) return; // Skip currently running for simple daily total
      const date = e.clock_in.split('T')[0];
      const dur = (new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()) / 1000;
      days[date] = (days[date] || 0) + dur;
    });

    // Return last 7 entries
    return Object.entries(days)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 7)
      .map(([date, seconds]) => ({ date, duration: formatDuration(seconds) }));
  };

  const getWeeklyStats = () => {
    if (!memberEntries.length) return [];

    const weeks: Record<string, number> = {};
    memberEntries.forEach(e => {
      if (!e.clock_out) return;
      const d = new Date(e.clock_in);
      // Get Monday of the week
      const day = d.getDay() || 7;
      if (day !== 1) d.setHours(-24 * (day - 1));
      const monday = d.toISOString().split('T')[0];

      const dur = (new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()) / 1000;
      weeks[monday] = (weeks[monday] || 0) + dur;
    });

    return Object.entries(weeks)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 4)
      .map(([startOfWeek, seconds]) => ({ startOfWeek, duration: formatDuration(seconds) }));
  };

  // --- Renders ---

  return (
    <div className="min-h-screen bg-epitimeBlue text-white p-6 md:p-10 font-sans selection:bg-epitimeYellow/30">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Team Command
            </h1>
            <p className="text-slate-400 mt-1 text-lg">
              {isAdmin ? "Oversee all teams and personnel." : "Manage your squad."}
            </p>
          </motion.div>

          <div className="flex gap-3">
            <button
              onClick={loadData}
              className="p-3 bg-slate-800/50 hover:bg-slate-700/50 text-cyan-400 rounded-xl border border-slate-700 transition"
              title="Refresh Data"
            >
              <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={loadReports}
              className={`p-3 rounded-xl border border-slate-700 transition flex items-center gap-2 ${viewMode === "reports" ? "bg-cyan-500 text-black border-cyan-500" : "bg-slate-800/50 text-slate-300 hover:text-white"
                }`}
              title="View Reports"
            >
              <BarChart size={20} />
              <span className="hidden md:inline font-bold">Reports</span>
            </button>

            {isAdmin && viewMode === "grid" && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setViewMode("create_team")}
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.3)] transition"
              >
                <Plus size={20} strokeWidth={3} />
                Create New Team
              </motion.button>
            )}

            {viewMode !== "grid" && (
              <button
                onClick={() => {
                  setViewMode("grid");
                  setSelectedTeamId(null);
                  setMsg(null);
                }}
                className="px-4 py-2 text-slate-300 hover:text-white flex items-center gap-2"
              >
                Close View <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <AnimatePresence>
          {msg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`p-4 rounded-xl border ${msg.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-200' : 'bg-green-500/10 border-green-500/50 text-green-200'} flex justify-between items-center`}
            >
              <span className="font-medium">{msg.text}</span>
              <button onClick={clearMsg}><X size={16} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- MAIN GRID VIEW --- */}
        {viewMode === "grid" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {teams.length === 0 && !loading && (
              <div className="col-span-full py-20 text-center text-slate-500">
                <Users size={64} className="mx-auto mb-4 opacity-20" />
                <p className="text-xl font-medium">No active teams found.</p>
                {isAdmin && <p className="text-sm mt-2">Click "Create New Team" to get started.</p>}
              </div>
            )}

            {teams.map((team, idx) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <GlassCard className="relative group hover:border-cyan-500/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)] h-full flex flex-col justify-between">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition mb-2">
                      {team.name}
                    </h3>
                    {team.managers.length > 0 ? (
                      <p className="text-sm text-cyan-200 mb-2">
                        Leads: {team.managers.map(m => m.full_name).join(", ")}
                      </p>
                    ) : (
                      <p className="text-sm text-red-400 mb-2">No Manager Assigned</p>
                    )}
                    <p className="text-slate-400 text-sm line-clamp-2">{team.description || "No description provided."}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                      <span className="text-slate-400">Members</span>
                      <span className="font-mono font-bold text-white">{team.members_count}</span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedTeamId(team.id);
                        setViewMode("manage_team");
                      }}
                      className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition flex items-center justify-center gap-2 group-hover:bg-cyan-500/10 group-hover:text-cyan-300"
                    >
                      Manage Team <ChevronRight size={14} />
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* --- REPORTS VIEW --- */}
        {viewMode === "reports" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-slate-900/50 border border-slate-700 p-6 rounded-2xl">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
                <BarChart className="text-cyan-400" /> Team Performance Reports
              </h2>
              <p className="text-slate-400">
                KPIs and stats for your team members. Hours are calculated based on closed sessions for today and this week.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {reports.length === 0 ? (
                <div className="text-slate-500 col-span-full text-center py-10">
                  No report data available.
                </div>
              ) : (
                reports.map((r, idx) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <GlassCard className="h-full flex flex-col justify-between">
                      <div className="mb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-bold text-white">{r.full_name}</h3>
                            <p className="text-sm text-slate-400 capitalize">{r.role}</p>
                          </div>
                          <div className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {r.team_name}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                          <div className="text-2xl font-mono font-bold text-cyan-400">{r.hours_today}h</div>
                          <div className="text-xs text-slate-500 mt-1">Today</div>
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                          <div className="text-2xl font-mono font-bold text-purple-400">{r.hours_week}h</div>
                          <div className="text-xs text-slate-500 mt-1">This Week</div>
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                          <div className={`text-2xl font-mono font-bold ${r.lates_month > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {r.lates_month}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">Late (Month)</div>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* --- CREATE TEAM VIEW --- */}
        {viewMode === "create_team" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto"
          >
            <GlassCard>
              <div className="mb-6 border-b border-slate-700 pb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Shield className="text-cyan-400" /> Create New Team
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Define a new operational unit. You can add managers and members after creation.
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  id="team-name"
                  label="Team Name"
                  value={newTeamName}
                  onChange={setNewTeamName}
                  placeholder="e.g. Sales Alpha"
                  className="w-full"
                />

                <div>
                  <label htmlFor="team-desc" className="block text-sm text-slate-400 mb-1">
                    Description
                  </label>
                  <textarea
                    id="team-desc"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 focus:border-cyan-500 outline-none transition min-h-[100px]"
                    placeholder="Purpose of this team..."
                    value={newTeamDesc}
                    onChange={e => setNewTeamDesc(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setViewMode("grid")}
                    className="px-4 py-2 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createTeam}
                    disabled={!newTeamName}
                    className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Team
                  </button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* --- MANAGE TEAM DETAILS --- */}
        {viewMode === "manage_team" && currentTeam && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Team Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{currentTeam.name}</h2>
                <p className="text-slate-400 max-w-2xl">{currentTeam.description}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setViewMode("grid")}
                  className="px-4 py-2 text-slate-400 hover:text-white transition"
                >
                  Back
                </button>
                {isAdmin && (
                  <button
                    onClick={() => deleteTeam(currentTeam.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition"
                  >
                    <Trash2 size={18} /> Dissolve Team
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Col: Team Composition */}
              <div className="lg:col-span-2 space-y-6">

                {/* Managers List */}
                <GlassCard className="border-l-4 border-l-purple-500">
                  <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                    <Shield className="text-purple-400" /> Team Managers
                  </h3>
                  <div className="space-y-3">
                    {currentTeamMembers.filter(m => m.role === 'manager' || m.role === 'admin').length === 0 ? (
                      <p className="text-slate-500 italic">No managers assigned.</p>
                    ) : (
                      currentTeamMembers.filter(m => m.role === 'manager' || m.role === 'admin').map(manager => (
                        <div key={manager.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                              {manager.full_name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-200">{manager.full_name}</div>
                              <div className="text-xs text-slate-500">{manager.email}</div>
                            </div>
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => assignToTeam(manager.id, null)}
                              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                              title="Remove from team"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </GlassCard>

                {/* Members List */}
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2 mb-4 px-2">
                    <Users className="text-cyan-400" /> Team Members
                    <span className="text-sm font-normal text-slate-500">({currentTeamMembers.filter(m => m.role === 'user').length})</span>
                  </h3>

                  <div className="grid gap-3">
                    {currentTeamMembers.filter(m => m.role === 'user').length === 0 && (
                      <div className="p-8 border-2 border-dashed border-slate-700 rounded-2xl text-center text-slate-500">
                        No regular members in this team.
                      </div>
                    )}

                    {currentTeamMembers.filter(m => m.role === 'user').map(member => (
                      <button
                        key={member.id}
                        onClick={() => {
                          setSelectedMember(member);
                          fetchUserTimeEntries(member.id); // Assuming this function exists or need to verify
                        }}
                        className="w-full bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl flex justify-between items-center group hover:bg-slate-800 transition cursor-pointer hover:border-cyan-500/30 text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${member.is_clocked_in ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                          <div>
                            <div className="font-semibold text-slate-200">{member.full_name}</div>
                            <div className="text-xs text-slate-500">{member.email}</div>
                          </div>
                        </div>

                        {(isAdmin || (user?.role === 'manager' && currentTeam?.id === user?.team_id)) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              assignToTeam(member.id, null);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                            title="Remove from team"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Col: Add Members */}
              {(isAdmin || (user?.role === 'manager' && currentTeam?.id === user?.team_id)) && (
                <div className="lg:col-span-1 space-y-6">
                  {/* Add Managers - Admin Only */}
                  {isAdmin && (
                    <GlassCard>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Available Managers</h3>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                        {unassignedManagers.length === 0 ? (
                          <p className="text-sm text-slate-500">No unassigned managers.</p>
                        ) : (
                          unassignedManagers.map(mgr => (
                            <button
                              key={mgr.id}
                              onClick={() => assignToTeam(mgr.id, currentTeam.id)}
                              className="w-full text-left p-2 rounded-lg hover:bg-purple-500/10 border border-transparent hover:border-purple-500/30 transition flex justify-between items-center group"
                            >
                              <span className="text-sm font-medium text-slate-300">{mgr.full_name}</span>
                              <Plus size={14} className="text-slate-500 group-hover:text-purple-400" />
                            </button>
                          ))
                        )}
                      </div>
                    </GlassCard>
                  )}

                  {/* Add Users - Admin & Manager */}
                  <GlassCard className="sticky top-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <UserPlus className="text-cyan-400" /> Add Members
                    </h3>

                    {/* Search */}
                    <div className="relative mb-4">

                      <Input
                        id="user-search"
                        label="Search Users"
                        value={userSearchTerm}
                        onChange={setUserSearchTerm}
                        placeholder="Search unassigned users..."
                        startIcon={<Search className="text-slate-500" size={18} />}
                        className="w-full"
                      />
                    </div>

                    {/* Results */}
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                      {unassignedUsers.length === 0 ? (
                        <div className="text-center text-slate-500 text-sm py-4">
                          {userSearchTerm ? "No matching users found." : "No available users."}
                        </div>
                      ) : (
                        unassignedUsers.map(user => (
                          <button
                            key={user.id}
                            onClick={() => assignToTeam(user.id, currentTeam.id)}
                            className="w-full text-left p-3 rounded-xl bg-slate-800/30 border border-transparent hover:bg-cyan-500/10 hover:border-cyan-500/30 transition flex justify-between items-center group"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate text-slate-300 group-hover:text-cyan-200">{user.full_name}</div>
                              <div className="text-xs text-slate-500 truncate">{user.email}</div>
                            </div>
                            <Plus size={16} className="text-slate-500 group-hover:text-cyan-400" />
                          </button>
                        ))
                      )}
                    </div>
                  </GlassCard>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* --- USER DETAIL MODAL --- */}
        <AnimatePresence>
          {selectedMember && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
              >
                <div className="p-6 border-b border-slate-700 flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      {selectedMember.full_name}
                      <span className={`text-xs px-2 py-1 rounded uppercase ${selectedMember.is_clocked_in ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                        {selectedMember.is_clocked_in ? 'Clocked In' : 'Clocked Out'}
                      </span>
                    </h2>
                    <p className="text-slate-400">{selectedMember.email}</p>
                  </div>
                  <button onClick={() => setSelectedMember(null)} className="p-1 hover:bg-slate-800 rounded">
                    <X className="text-slate-400" />
                  </button>
                </div>

                <div className="p-6 space-y-8">

                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                      <h4 className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                        <Clock size={16} /> Tardiness Status (Today)
                      </h4>
                      <div className="text-xl font-bold capitalize">
                        <span className={`${selectedMember.today_status === 'late' ? 'text-red-400' : selectedMember.today_status === 'normal' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                          {selectedMember.today_status}
                        </span>
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        className="w-full text-left p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-epitimeYellow/50 transition cursor-pointer"
                        onClick={() => setShowPasswordReset(!showPasswordReset)}
                      >
                        <h4 className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                          <Lock size={16} /> Admin Actions
                        </h4>
                        <div className="text-epitimeYellow font-medium text-sm mt-2 flex items-center gap-2">
                          Reset Password <ChevronRight size={14} />
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Password Reset Form */}
                  <AnimatePresence>
                    {showPasswordReset && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl space-y-3">
                          <h4 className="font-bold text-epitimeYellow">Set New Password</h4>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              placeholder="Enter new password..."
                              className="flex-1 bg-black/30 border border-yellow-500/30 rounded px-3 py-2 focus:outline-none focus:border-yellow-500"
                            />
                            <button
                              onClick={handleResetPassword}
                              disabled={resetLoading || !newPassword}
                              className="bg-epitimeYellow text-black font-bold px-4 py-2 rounded hover:bg-yellow-400 disabled:opacity-50"
                            >
                              {resetLoading ? "Saving..." : "Save"}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Hours Visualization */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <BarChart size={18} className="text-cyan-400" /> Daily Hours (Last 7 Days)
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {entriesLoading ? <p className="text-slate-500 text-sm">Loading...</p> :
                          getRecentDailyStats().map(stat => (
                            <div key={stat.date} className="bg-slate-800 p-3 rounded-lg text-center">
                              <div className="text-xs text-slate-500">{stat.date}</div>
                              <div className="font-mono font-bold text-cyan-300">{stat.duration}</div>
                            </div>
                          ))}
                        {!entriesLoading && getRecentDailyStats().length === 0 && (
                          <div className="text-slate-500 text-sm col-span-full">No recent activity.</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Clipboard size={18} className="text-purple-400" /> Weekly Summary
                      </h3>
                      <div className="space-y-2">
                        {getWeeklyStats().map(stat => (
                          <div key={stat.startOfWeek} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                            <span className="text-sm text-slate-400">Week of {stat.startOfWeek}</span>
                            <span className="font-mono font-bold text-purple-300">{stat.duration}</span>
                          </div>
                        ))}
                        {!entriesLoading && getWeeklyStats().length === 0 && (
                          <div className="text-slate-500 text-sm">No weekly data available.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Working Hours Section */}
                  <div className="border-t border-slate-700 pt-6">
                    <button
                      className="w-full text-left mb-4 flex items-center justify-between group"
                      onClick={() => {
                        if (!showWorkingHours) {
                          fetchWorkingHours(selectedMember.id);
                        }
                        setShowWorkingHours(!showWorkingHours);
                      }}
                    >
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Calendar size={18} className="text-emerald-400" /> Working Hours Schedule
                      </h3>
                      <ChevronRight
                        size={18}
                        className={`text-slate-500 transition-transform ${showWorkingHours ? 'rotate-90' : ''}`}
                      />
                    </button>

                    <AnimatePresence>
                      {showWorkingHours && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-3 bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                            {workingHoursLoading ? (
                              <p className="text-slate-500 text-sm">Loading...</p>
                            ) : (
                              <>
                                {workingHours.map((wh, idx) => (
                                  <div
                                    key={wh.day_of_week}
                                    className={`flex items-center gap-3 p-3 rounded-lg border transition ${wh.enabled
                                      ? 'bg-emerald-500/10 border-emerald-500/30'
                                      : 'bg-slate-800/50 border-slate-700/50'
                                      }`}
                                  >
                                    <button
                                      onClick={() => {
                                        const newHours = [...workingHours];
                                        newHours[idx].enabled = !newHours[idx].enabled;
                                        setWorkingHours(newHours);
                                      }}
                                      className={`w-10 h-6 rounded-full transition relative ${wh.enabled ? 'bg-emerald-500' : 'bg-slate-600'
                                        }`}
                                    >
                                      <div
                                        className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${wh.enabled ? 'left-5' : 'left-1'
                                          }`}
                                      />
                                    </button>

                                    <span className={`w-24 font-medium ${wh.enabled ? 'text-white' : 'text-slate-500'}`}>
                                      {DAY_NAMES[wh.day_of_week]}
                                    </span>

                                    {wh.enabled && (
                                      <div className="flex items-center gap-2 flex-1">
                                        <input
                                          type="time"
                                          value={wh.start_time}
                                          onChange={(e) => {
                                            const newHours = [...workingHours];
                                            newHours[idx].start_time = e.target.value;
                                            setWorkingHours(newHours);
                                          }}
                                          className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
                                        />
                                        <span className="text-slate-500">to</span>
                                        <input
                                          type="time"
                                          value={wh.end_time}
                                          onChange={(e) => {
                                            const newHours = [...workingHours];
                                            newHours[idx].end_time = e.target.value;
                                            setWorkingHours(newHours);
                                          }}
                                          className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
                                        />
                                      </div>
                                    )}

                                    {!wh.enabled && (
                                      <span className="text-slate-600 text-sm italic">Rest day</span>
                                    )}
                                  </div>
                                ))}

                                <div className="flex justify-end pt-2">
                                  <button
                                    onClick={saveWorkingHours}
                                    disabled={workingHoursLoading}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg transition disabled:opacity-50"
                                  >
                                    {workingHoursLoading ? "Saving..." : "Save Working Hours"}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}