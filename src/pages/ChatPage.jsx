import { useEffect, useRef, useState } from "react";
import { UserAuth } from "../context/AuthContext.jsx";
import { supabase } from "../supabaseClient.js";
import "./ChatPage.css";

export default function ChatPage() {
  const { session } = UserAuth();
  const [activeTab, setActiveTab] = useState("community");
  const [communityMessages, setCommunityMessages] = useState([]);
  const [aiMessages, setAiMessages] = useState([
    {
      sender: "MOVA AI",
      userId: "ai-bot",
      text: "Hi! Ask me anything about MOVA.",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef(null);

  const username =
    session?.user?.user_metadata?.username ||
    session?.user?.user_metadata?.display_name ||
    session?.user?.email?.split("@")[0] ||
    "User";

  // 1. Load past messages & listen for new messages + online users
  useEffect(() => {
    if (!session?.user) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading messages:", error.message);
      } else if (data) {
        const loadedMessages = data.map((row) => ({
          sender: row.sender,
          userId: row.user_id,
          text: row.text,
          time: new Date(row.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));
        setCommunityMessages(loadedMessages);
      }
    };

    fetchMessages();

    const channel = supabase.channel("mova-community", {
      config: {
        presence: { key: session.user.id },
      },
    });

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        const row = payload.new;
        const incomingMsg = {
          sender: row.sender,
          userId: row.user_id,
          text: row.text,
          time: new Date(row.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setCommunityMessages((prev) => [...prev, incomingMsg]);
      }
    );

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const usersList = Object.values(state).map((presences) => presences[0]);
      setOnlineUsers(usersList);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          userId: session.user.id,
          name: username,
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, username]);

  // 2. Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [communityMessages, aiMessages, activeTab]);

  // 3. Send Message Handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const textToSend = newMessage;
    setNewMessage("");

    if (activeTab === "community") {
      const { error } = await supabase.from("messages").insert([
        {
          user_id: session?.user?.id,
          sender: username,
          text: textToSend,
        },
      ]);

      if (error) {
        console.error("Error sending message:", error.message);
      }
    } else {
      const msgObject = {
        sender: username,
        userId: session?.user?.id,
        text: textToSend,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setAiMessages((prev) => [...prev, msgObject]);
      setIsAiTyping(true);

      try {
        const res = await fetch("http://127.0.0.1:5000/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: textToSend }),
        });
        const data = await res.json();

        setAiMessages((prev) => [
          ...prev,
          {
            sender: "MOVA AI",
            userId: "ai-bot",
            text: data.reply || "Sorry, something went wrong.",
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      } catch (err) {
        console.error("AI chat error:", err);
      } finally {
        setIsAiTyping(false);
      }
    }
  };

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
          <div className="chat-header" style={{ justifyContent: "space-between" }}>
            <span>
              {activeTab === "community" ? "# Community Chat" : "# AI Assistant"}
            </span>
            <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: "normal" }}>
              Signed in as: <strong>{username}</strong>
            </span>
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
            {activeTab === "ai" && isAiTyping && (
           <p style={{ color: "#9ca3af", fontSize: "13px", fontStyle: "italic" }}>
             MOVA AI is typing...
           </p>
            )}
            <div ref={chatEndRef} />
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