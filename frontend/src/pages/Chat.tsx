// Fichier : ChatPage.jsx (ou .tsx)

import React, { useState } from "react"; // Assurez-vous d'importer React
import {
  Send,
  Smile,
  Paperclip,
  Users,
  PlusCircle,
} from "lucide-react";
// Remplacement : Supprimer l'import de 'next/image'

interface Message {
  id: number;
  author: string;
  content: string;
  time: string;
  isMine: boolean;
}

interface Chat {
  name: string;
  avatar: string;
}

// Suppression de "use client";
export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      author: "Alex Martin (Manager)",
      content: "Hi team! Don’t forget to update your timesheets today.",
      time: "09:15 AM",
      isMine: false,
    },
    {
      id: 2,
      author: "You",
      content: "Thanks Alex! I’ll do it before lunch.",
      time: "09:17 AM",
      isMine: true,
    },
  ]);

  const [chats, setChats] = useState<Chat[]>([
    {
      name: "Team Alpha",
      avatar: "https://cdn-icons-png.flaticon.com/512/2103/2103691.png",
    },
    {
      name: "Management",
      avatar: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
    },
    {
      name: "Training Dept",
      avatar: "https://cdn-icons-png.flaticon.com/512/685/685471.png",
    },
  ]);

  const [selectedChat, setSelectedChat] = useState("Team Alpha");
  const [newMessage, setNewMessage] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatName, setNewChatName] = useState("");

  const handleSend = () => {
    if (!newMessage.trim()) return;
    const newMsg: Message = {
      id: messages.length + 1,
      author: "You",
      content: newMessage,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isMine: true,
    };
    setMessages([...messages, newMsg]);
    setNewMessage("");
  };

  const handleAddChat = () => {
    if (!newChatName.trim()) return;
    const newChat = {
      name: newChatName,
      avatar: "https://cdn-icons-png.flaticon.com/512/4140/4140048.png",
    };
    setChats([...chats, newChat]);
    setSelectedChat(newChat.name);
    setShowNewChat(false);
    setNewChatName("");
  };

  return (
    <div className="flex h-screen bg-gradient-to-b from-blue-950 via-blue-900 to-indigo-900 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r border-blue-800 bg-blue-950/70 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-blue-800">
          <h2 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
            <Users size={18} className="text-yellow-400" /> Chats
          </h2>
          <button
            onClick={() => setShowNewChat(true)}
            className="hover:scale-105 transition"
          >
            <PlusCircle size={22} className="text-yellow-400 hover:text-yellow-300" />
          </button>
        </div>

        {/* New Chat Modal (Pas de changement) */}
        {showNewChat && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-950/90 border border-blue-800 rounded-2xl shadow-lg p-6 w-80 z-50 backdrop-blur-xl">
            <h3 className="text-xl font-semibold text-yellow-400 mb-4">
              New Chat
            </h3>
            <input
              type="text"
              placeholder="Enter chat name..."
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              className="w-full bg-blue-900/50 border border-blue-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowNewChat(false)}
                className="px-3 py-2 text-sm bg-blue-800/50 hover:bg-blue-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddChat}
                className="px-4 py-2 text-sm bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-300"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <button
              key={chat.name}
              onClick={() => setSelectedChat(chat.name)}
              className={`flex items-center w-full px-5 py-3 hover:bg-blue-900 transition-all ${
                selectedChat === chat.name ? "bg-blue-800" : ""
              }`}
            >
              {/* Remplacement : next/image par img standard */}
              <img
                src={chat.avatar}
                alt={chat.name}
                width={36}
                height={36}
                className="rounded-full mr-3"
              />
              <span className="font-medium">{chat.name}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col relative pb-24">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-800 bg-blue-950/80">
          <div className="flex items-center gap-3">
            {/* Remplacement : next/image par img standard */}
            <img
              src="https://cdn-icons-png.flaticon.com/512/2103/2103691.png"
              alt="Chat Avatar"
              width={40}
              height={40}
              className="rounded-full"
            />
            <div>
              <h3 className="text-lg font-semibold">{selectedChat}</h3>
              <p className="text-sm text-blue-300">Active now</p>
            </div>
          </div>
        </div>

        {/* Messages (Pas de changement) */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 min-h-0">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                  msg.isMine
                    ? "bg-yellow-400 text-gray-900 rounded-br-none"
                    : "bg-blue-800/50 border border-blue-700 text-white rounded-bl-none"
                }`}
              >
                {!msg.isMine && (
                  <p className="text-xs text-blue-300 mb-1">{msg.author}</p>
                )}
                <p className="text-sm">{msg.content}</p>
                <span className="block text-xs text-gray-300 mt-1 text-right">
                  {msg.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Fixed input bar (Pas de changement) */}
        <div className="fixed bottom-0 left-[18rem] right-0 border-t border-blue-800 bg-blue-950/90 backdrop-blur-md p-4 flex items-center gap-3 shadow-lg z-50">
          <button className="p-2 hover:bg-blue-800 rounded-lg transition">
            <Smile size={20} className="text-yellow-400" />
          </button>
          <button className="p-2 hover:bg-blue-800 rounded-lg transition">
            <Paperclip size={20} className="text-yellow-400" />
          </button>
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 bg-blue-900/50 border border-blue-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <button
            onClick={handleSend}
            className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg hover:bg-yellow-300 transition flex items-center gap-2 font-semibold"
          >
            <Send size={18} /> Send
          </button>
        </div>
      </main>
    </div>
  );
}


export default ChatPage;