/* eslint-disable react-hooks/exhaustive-deps */
// Chat.tsx - Full featured chat with edit/delete messages and conversation management

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Send,
  Users,
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

interface Message {
  id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  created_at: string;
}

interface Conversation {
  id: number;
  name: string;
  is_direct: boolean;
  last_message: {
    content: string;
    sender_name: string;
    created_at: string;
  } | null;
  participant_count: number;
}

interface CurrentUser {
  id: number;
  full_name: string;
}

interface TeamMember {
  id: number;
  full_name: string;
  role: string;
}

export function ChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Message action states
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("access_token");
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  }, []);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetchWithAuth(`${API_URL}/api/users/me/`);
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data);
        }
      } catch {
        // Failed
      }
    };
    loadUser();
  }, [API_URL, fetchWithAuth]);

  // Load all conversations
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/chat/conversations/`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        return data;
      }
    } catch {
      // Failed
    }
    return [];
  }, [API_URL, fetchWithAuth]);

  // Init chat
  useEffect(() => {
    const initChat = async () => {
      setLoading(true);
      try {
        await fetchWithAuth(`${API_URL}/api/users/chat/team/`);
        const convs = await loadConversations();

        const userId = searchParams.get("userId");
        if (userId) {
          const res = await fetchWithAuth(`${API_URL}/api/users/chat/direct/`, {
            method: "POST",
            body: JSON.stringify({ user_id: parseInt(userId) }),
          });
          if (res.ok) {
            const conv = await res.json();
            await loadConversations();
            setSelectedConversation(conv);
            navigate("/chat", { replace: true });
          }
        } else if (convs.length > 0) {
          setSelectedConversation(convs[0]);
        }
      } catch {
        // Failed
      } finally {
        setLoading(false);
      }
    };
    initChat();
  }, [API_URL, fetchWithAuth, loadConversations, searchParams, navigate]);

  // Load team members
  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        const res = await fetchWithAuth(`${API_URL}/api/users/me/team/`);
        if (res.ok) {
          const data = await res.json();
          const members = [...(data.members || [])];
          if (data.manager) members.push(data.manager);
          setTeamMembers(members.filter((m: TeamMember) => m.id !== currentUser?.id));
        }
      } catch {
        // Failed
      }
    };
    if (currentUser) loadTeamMembers();
  }, [API_URL, fetchWithAuth, currentUser]);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!selectedConversation) return;
    try {
      const res = await fetchWithAuth(
        `${API_URL}/api/users/chat/conversations/${selectedConversation.id}/messages/`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {
      // Failed
    }
  }, [selectedConversation, API_URL, fetchWithAuth]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Polling
  useEffect(() => {
    if (!selectedConversation) return;
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [selectedConversation, loadMessages]);

  // Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    try {
      const res = await fetchWithAuth(
        `${API_URL}/api/users/chat/conversations/${selectedConversation.id}/messages/`,
        { method: "POST", body: JSON.stringify({ content: newMessage }) }
      );
      if (res.ok) {
        const message = await res.json();
        setMessages((prev) => [...prev, message]);
        setNewMessage("");
      }
    } catch {
      // Failed
    }
  };

  const handleStartDirectChat = async (userId: number) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/chat/direct/`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) {
        const conv = await res.json();
        await loadConversations();
        setSelectedConversation(conv);
        setShowNewChat(false);
      }
    } catch {
      // Failed
    }
  };

  const handleDeleteConversation = async (convId: number) => {
    if (!window.confirm("Delete this conversation?")) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/chat/conversations/${convId}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadConversations();
        if (selectedConversation?.id === convId) {
          setSelectedConversation(null);
        }
      }
    } catch {
      // Failed
    }
  };

  const handleEditMessage = async (messageId: number) => {
    if (!editContent.trim()) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/chat/messages/${messageId}/`, {
        method: "PUT",
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
        setEditingMessageId(null);
        setEditContent("");
      }
    } catch {
      // Failed
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/chat/messages/${messageId}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        setSelectedMessageId(null);
      }
    } catch {
      // Failed
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-b from-blue-950 via-blue-900 to-indigo-900 text-white items-center justify-center">
        <div className="text-xl">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-b from-blue-950 via-blue-900 to-indigo-900 text-white overflow-hidden">
      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 w-80 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">New Conversation</h3>
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleStartDirectChat(member.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-700 transition"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-slate-900 font-bold">
                    {member.full_name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{member.full_name}</div>
                    <div className="text-xs text-slate-400">{member.role}</div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowNewChat(false)}
              className="mt-4 w-full py-2 bg-slate-700 rounded-lg hover:bg-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-72 border-r border-blue-800 bg-blue-950/70 flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-blue-800">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 rounded-lg bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30"
          >
            <Plus size={18} />
          </button>
        </div>

        <h2 className="text-lg font-bold text-yellow-400 flex items-center gap-2 px-5 py-3">
          <Users size={18} /> Chats
        </h2>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="text-center text-slate-400 py-8 px-4">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`flex items-center w-full px-5 py-4 hover:bg-blue-900 transition-all border-b border-blue-800/50 group ${selectedConversation?.id === conv.id ? "bg-blue-800" : ""
                  }`}
              >
                <button
                  onClick={() => setSelectedConversation(conv)}
                  className="flex items-center flex-1 min-w-0"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-slate-900 font-bold mr-3 ${conv.is_direct
                    ? "bg-gradient-to-br from-emerald-400 to-cyan-500"
                    : "bg-gradient-to-br from-cyan-400 to-blue-500"
                    }`}>
                    {conv.is_direct ? conv.name.charAt(0) : <Users size={18} />}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium truncate">{conv.name}</div>
                    <div className="text-xs text-slate-400 truncate">
                      {conv.last_message ? conv.last_message.content : "No messages"}
                    </div>
                  </div>
                </button>
                {conv.is_direct && (
                  <button
                    onClick={() => handleDeleteConversation(conv.id)}
                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col relative">
        {selectedConversation ? (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue-800 bg-blue-950/80">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-slate-900 font-bold ${selectedConversation.is_direct
                  ? "bg-gradient-to-br from-emerald-400 to-cyan-500"
                  : "bg-gradient-to-br from-cyan-400 to-blue-500"
                  }`}>
                  {selectedConversation.is_direct ? selectedConversation.name.charAt(0) : <Users size={18} />}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedConversation.name}</h3>
                  <p className="text-sm text-blue-300">
                    {selectedConversation.is_direct ? "Direct message" : `${selectedConversation.participant_count} members`}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = currentUser?.id === msg.sender_id;
                  const isSelected = selectedMessageId === msg.id;
                  const isEditing = editingMessageId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div className="relative">
                        {isEditing ? (
                          <div className="flex items-center gap-2 bg-blue-800/80 rounded-2xl px-4 py-3">
                            <input
                              type="text"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleEditMessage(msg.id)}
                              className="bg-transparent border-b border-white focus:outline-none"
                            />
                            <button onClick={() => handleEditMessage(msg.id)} className="text-green-400 hover:text-green-300">
                              <Check size={18} />
                            </button>
                            <button onClick={() => setEditingMessageId(null)} className="text-red-400 hover:text-red-300">
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => isMine && setSelectedMessageId(isSelected ? null : msg.id)}
                            className={`max-w-md px-4 py-3 rounded-2xl shadow-sm text-left ${isMine
                              ? "bg-yellow-400 text-gray-900 rounded-br-none"
                              : "bg-blue-800/50 border border-blue-700 text-white rounded-bl-none"
                              }`}
                          >
                            {!isMine && <p className="text-xs text-blue-300 mb-1">{msg.sender_name}</p>}
                            <p className="text-sm">{msg.content}</p>
                            <span className={`block text-xs mt-1 text-right ${isMine ? "text-gray-600" : "text-gray-400"}`}>
                              {formatTime(msg.created_at)}
                            </span>
                          </button>
                        )}

                        {/* Message actions */}
                        {isSelected && isMine && !isEditing && (
                          <div className="absolute -top-8 right-0 flex gap-1 bg-slate-800 rounded-lg p-1 shadow-lg">
                            <button
                              onClick={() => {
                                setEditingMessageId(msg.id);
                                setEditContent(msg.content);
                                setSelectedMessageId(null);
                              }}
                              className="p-1.5 rounded hover:bg-slate-700 text-blue-400"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1.5 rounded hover:bg-slate-700 text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-blue-800 bg-blue-950/90 backdrop-blur-md p-4 flex items-center gap-3">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 bg-blue-900/50 border border-blue-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim()}
                className="bg-yellow-400 text-gray-900 px-5 py-3 rounded-lg hover:bg-yellow-300 transition flex items-center gap-2 font-semibold disabled:opacity-50"
              >
                <Send size={18} />
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Select a conversation to start chatting
          </div>
        )}
      </main>
    </div>
  );
}

export default ChatPage;
