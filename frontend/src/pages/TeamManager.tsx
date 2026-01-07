import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Clock, Shield, Plus, Save, RefreshCcw } from "lucide-react";

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

export default function TeamManagerPage() {
  const { user } = useAuth();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  // ---- Hooks first (never return before these) ----
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [tab, setTab] = useState<"team" | "history" | "admin">("team");
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
            <h2 className="font-bold text-yellow-400 mb-3">
              {isAdmin ? "All Users" : "My Team"}
            </h2>

            {loading && <p className="text-blue-200 text-sm">Loading…</p>}

            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => selectMember(m)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                    selected?.id === m.id
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

          {/* Right panel: details */}
          <div className="md:col-span-2 bg-blue-950/50 border border-blue-800 rounded-2xl p-6">
            {!selected ? (
              <div className="text-blue-200">Select a person to view details.</div>
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
                      className={`px-4 py-2 rounded-xl font-semibold ${
                        tab === "team" ? "bg-yellow-400 text-gray-900" : "bg-blue-900/40"
                      }`}
                    >
                      Team
                    </button>

                    <button
                      onClick={async () => {
                        setTab("history");
                        await loadHistory(selected.id);
                      }}
                      className={`px-4 py-2 rounded-xl font-semibold ${
                        tab === "history" ? "bg-yellow-400 text-gray-900" : "bg-blue-900/40"
                      }`}
                    >
                      History
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => setTab("admin")}
                        className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 ${
                          tab === "admin" ? "bg-yellow-400 text-gray-900" : "bg-blue-900/40"
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
                              className={`px-4 py-2 rounded-xl border font-semibold ${
                                status === s
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
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}