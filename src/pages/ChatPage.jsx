import React from 'react'
import { useEffect, useRef, useState } from "react";
import { UserAuth } from "../context/AuthContext.jsx";
import { supabase } from "../supabaseClient.js";
import "./ChatPage.css";

function ChatPage() {
    const { session } = UserAuth();
    const [activeTab, setActiveTab] = useState("community")

    // 1. Separate message lists for Community and AI
    const [communityMessages, setCommunityMessages] = useState([]);
    const [aiMessages, setAiMessages] = useState([
    {
      sender: "MOVA AI",
      userId: "ai-bot",
      text: "Hi! Ask me anything about MOVA.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
    ]);

  // 2. Tracks whatever you are currently typing in the input box
     const [newMessage, setNewMessage] = useState("");

  // Get your display name (or email prefix if display_name isn't set yet)
    const myName =
        session?.user?.user_metadata?.display_name ||
        session?.user?.email?.split("@")[0] ||
        "You";

    const [onlineUsers, setOnlineUsers] = useState([]);
  const chatEndRef = useRef(null);

  // Connect to Supabase Realtime room for Community Chat
  useEffect(() => {
    if (!session?.user) return;

    const channel = supabase.channel("mova-community", {
      config: {
        broadcast: {self: true },
        presence: { key: session.user.id },
      },
    });

    // Listen for new messages from anyone in the room
    channel.on("broadcast", { event: "message" }, ({ payload }) => {
      setCommunityMessages((prev) => [...prev, payload]);
    });

    // Listen for users joining/leaving to update the Online sidebar
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      // Extract each online user's info (name & id)
      const usersList = Object.values(state).map((presences) => presences[0]);
      setOnlineUsers(usersList);
    });

    // Join the channel and announce our name
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          userId: session.user.id,
          name: myName,
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
    }, [session, myName]);

    // Auto-scroll to the bottom when messages update
     useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [communityMessages, aiMessages, activeTab]);

  // 3. Runs when you submit the form
    const handleSendMessage = async (e) => {
        e.preventDefault(); // Prevents the browser from refreshing the page
        if (!newMessage.trim()) return; // Ignores empty/space-only messages

    const msgObject = {
      sender: myName,
      userId: session?.user?.id,
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Add the message to whichever channel is currently open
    if (activeTab === "community") {
      await supabase.channel("mova-community").send({
        type: "broadcast",
        event: "message",
        payload: msgObject,
      });
    } else {
      setAiMessages((prev) => [...prev, msgObject]);
    }

    setNewMessage(""); // Clears the input box after sending
    };

  // Pick which list of messages to display on screen
    const currentMessages =
    activeTab === "community" ? communityMessages : aiMessages;


    return (
        <div className="chat-page-wrapper">
      <div className="chat-box">
        {/* LEFT SIDEBAR */}
        <div className="chat-sidebar">
          <div>
            <div className="sidebar-title">Channels</div>

            <button
              type="button"
              onClick={() => setActiveTab("community")}
              className={`channel-btn ${activeTab === "community" ? "active" : ""}`}
            >
              # Community Chat
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              className={`channel-btn ${activeTab === "ai" ? "active" : ""}`}
            >
              # AI Assistant
            </button>
          </div>

          {activeTab === "community" && (
            <div className="online-section">
                <div className="sidebar-title">Online — {onlineUsers.length}</div>
                    {onlineUsers.map((user, idx) => (
                        <p key={idx} className="online-user">
                        🟢 {user.name}
                        </p>
                    ))}
            </div>
          )}
        </div>

        {/* RIGHT MAIN AREA */}
        <div className="chat-main">
          <div className="chat-header">
            {activeTab === "community" ? "# Community Chat" : "# AI Assistant"}
          </div>

          <div className="chat-messages">
            {currentMessages.length === 0 && (
              <p style={{ color: "#9ca3af", fontSize: "14px" }}>
                No messages yet. Say hello!
              </p>
            )}

            {currentMessages.map((msg, index) => {
              const isMine = msg.userId === session?.user?.id;
              return (
                <div
                  key={index}
                  className={`message-row ${isMine ? "mine" : "theirs"}`}
                >
                  <span className="message-meta">
                    {msg.sender} • {msg.time}
                  </span>
                  <div className="message-bubble">{msg.text}</div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-form">
            <input
              type="text"
              className="chat-input"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                activeTab === "community"
                  ? "Message #community-chat"
                  : "Ask AI Assistant..."
              }
            />
            <button type="submit" className="chat-send-btn">
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ChatPage