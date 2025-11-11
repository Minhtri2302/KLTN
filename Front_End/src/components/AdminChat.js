import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import io from "socket.io-client";
import '../CSS/adminChat.css';

const SOCKET_URL = "http://localhost:5000";

function formatMsgTime(msg) {
  if (!msg) return "";
  const candidates = [msg.createdAt, msg.time];
  for (let c of candidates) {
    if (!c && c !== 0) continue;
    const d = new Date(c);
    if (!isNaN(d)) return d.toLocaleString();
  }
  return "";
}

// --- Sidebar user item ---
function SidebarUser({ u, isSelected, onSelect, unreadCount = 0 }) {
  return (
    <div
      onClick={() => onSelect(u)}
      className={`sidebar-user ${isSelected ? 'sidebar-user-selected' : ''}`}
    >
      <img
        src={u.avatar || "https://res.cloudinary.com/dyefelufh/image/upload/v1760624976/kltu_products/aajhzwjgaonpf3t6utfk.svg"}
        alt="avatar"
        className="sidebar-user-avatar"
      />
      <div className="sidebar-user-info">
        <div className="sidebar-user-name">
          {u.name || `User${u.id}`}
        </div>
        <div className="sidebar-user-status-row">
          <div className="sidebar-user-online-status">
            <span className={`status-dot ${u.online ? 'status-online' : 'status-offline'}`} />
            <span className={`status-text ${u.online ? 'status-online' : 'status-offline'}`}>
              {u.online ? 'Đang hoạt động' : 'Không hoạt động'}
            </span>
          </div>
          <div className="sidebar-user-last-message">
            {u.lastMessage ? `💬 ${u.lastMessage}` : 'Chưa có tin nhắn'}
          </div>
          {unreadCount > 0 && (
            <div className="sidebar-user-unread-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Message item ---
function MessageItem({ msg, selectedUser, defaultAvatar }) {
  const fromAdmin = String(msg.fromId) !== String(selectedUser.id);
  
  // ✅ Xử lý avatar đồng nhất
  // Nếu từ admin: dùng msg.avatar (từ backend)
  // Nếu từ user: ưu tiên msg.avatar, fallback selectedUser.avatar, cuối cùng default
  const avatarSrc = fromAdmin 
    ? (msg.avatar || defaultAvatar) 
    : (msg.avatar || selectedUser?.avatar || defaultAvatar);

  return (
    <div className={`message-item ${fromAdmin ? 'message-from-admin' : 'message-from-user'}`}>
      {!fromAdmin && (
        <img src={avatarSrc} alt="avatar" className="message-avatar" />
      )}
      <div className={`message-bubble ${fromAdmin ? 'bubble-admin' : 'bubble-user'}`}>
        <div className="message-author">
          {fromAdmin ? "Bạn" : selectedUser.name}
        </div>
        <div className="message-text">{msg.message}</div>
        <div className={`message-time ${fromAdmin ? 'time-admin' : 'time-user'}`}>
          {formatMsgTime(msg)}
        </div>
        {fromAdmin && msg.read && (
          <div className="message-read-status">Đã xem</div>
        )}
      </div>
    </div>
  );
}

export default function AdminChat({ fullScreen: initialFullScreen = false }) {
  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageList, setMessageList] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(initialFullScreen);
  const messagesEndRef = useRef(null);

  const TOKEN = sessionStorage.getItem("token");
  const DEFAULT_AVATAR = useMemo(
    () => "https://res.cloudinary.com/dyefelufh/image/upload/v1760624976/kltu_products/aajhzwjgaonpf3t6utfk.svg",
    []
  );

  // If there's no token, redirect to login immediately
  useEffect(() => {
    if (!TOKEN) {
      navigate('/login');
    }
  }, [TOKEN, navigate]);

  // --- Socket connection ---
  useEffect(() => {
    if (!TOKEN) return;

    const s = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: { token: TOKEN },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    s.on("connect", () => {
      console.log("Admin socket connected:", s.id);
      s.emit('join_admin_room');
    });

    s.on("disconnect", (r) => console.log("Socket disconnected:", r));
    s.on("connect_error", (e) => {
      console.error("Socket error:", e);
      // If the error indicates authentication, redirect to login
      try {
        const msg = (e && e.message) ? String(e.message).toLowerCase() : '';
        if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('authorization')) {
          navigate('/login');
        }
      } catch (err) {
        // ignore
      }
    });

    setSocket(s);

    return () => {
      if (s?.connected) s.disconnect();
    };
  }, [TOKEN, navigate]);

  // --- Fetch participants ---
  const fetchParticipants = useCallback(async () => {
    if (!TOKEN) return;
    try {
      const res = await fetch(`${SOCKET_URL}/chat/participants`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      });
      if (res.status === 401 || res.status === 403) {
        navigate('/login');
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setParticipants(data);
      }
    } catch (err) {
      console.error("Error fetching participants", err);
    }
  }, [TOKEN]);

  useEffect(() => {
    fetchParticipants();
    // Refetch participants mỗi 5 giây để sync trạng thái
    const interval = setInterval(fetchParticipants, 5000);
    return () => clearInterval(interval);
  }, [fetchParticipants]);

  // --- Load history khi chọn user ---
  useEffect(() => {
    if (!selectedUser) {
      setMessageList([]);
      return;
    }

    if (!TOKEN) return;

    (async () => {
      try {
        // Báo cho backend biết admin đang xem user nào
        if (socket && socket.connected) {
          console.log(` Emitting admin_viewing_chat for user: ${selectedUser.id}`);
          socket.emit('admin_viewing_chat', { userId: selectedUser.id });
        }

        const res = await fetch(`${SOCKET_URL}/chat/history/${selectedUser.id}`, {
          headers: { Authorization: `Bearer ${TOKEN}` },
        });
        if (res.status === 401 || res.status === 403) {
          navigate('/login');
          return;
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setMessageList(data);
          setParticipants(prev => prev.map(p => String(p.id) === String(selectedUser.id) ? { ...p, unreadCount: 0 } : p));
          try {
            if (socket && socket.connected) {
              socket.emit('admin_mark_read', { userId: selectedUser.id });
            }
          } catch (err) { 
            console.error("Error emitting admin_mark_read:", err);
           }
        }
      } catch (err) {
        console.error("Error loading history:", err);
      }
    })();
  }, [selectedUser, TOKEN, socket, navigate]);

  // --- Listen socket events ---
  useEffect(() => {
    if (!socket) return;

    // Khi admin disconnect
    const onDisconnect = () => {
      console.log("Admin socket disconnected");
      // Đánh dấu tất cả users là offline
      setParticipants(prev => prev.map(p => ({ ...p, online: false })));
    };

    // Khi có user online/offline
    const onUserOnline = (data) => {
      console.log("User online:", data);
      const userId = String(data?.userId);
      setParticipants(prev => prev.map(p => String(p.id) === userId ? { ...p, online: true } : p));
    };

    const onUserOffline = (data) => {
      console.log("User offline:", data);
      const userId = String(data?.userId);
      setParticipants(prev => prev.map(p => String(p.id) === userId ? { ...p, online: false } : p));
    };

    // Nhận tin nhắn mới
    const onReceiveMessage = (msg) => {
      console.log("Received message:", msg);

      if (selectedUser && (msg.userId === selectedUser.id || msg.toUserId === selectedUser.id)) {
        setMessageList((prev) => {
          const id = String(msg._id || msg.id);
          if (prev.some(m => String(m._id || m.id) === id)) return prev;
          return [...prev, msg];
        });
      }
    };

    // Nhận cập nhật participant
    const onParticipantUpdated = (update) => {
      console.log("Participant updated:", update);

      setParticipants(prev => {
        const updated = prev.map(p => {
          if (String(p.id) !== String(update.id)) return p;
          const merged = { ...p };
          if (update.unreadCount !== undefined) {
            merged.unreadCount = update.unreadCount;
          }
          if (update.lastMessage !== undefined) {
            merged.lastMessage = update.lastMessage;
            merged.lastMessageAt = update.lastMessageAt;
          }
          return merged;
        });

        updated.sort((a, b) => {
          const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return timeB - timeA;
        });

        return updated;
      });
    };

    // Lắng nghe khi user đọc tin nhắn
    const onMessagesMarkedRead = (data) => {
      console.log(' Messages marked as read:', data);

      const { userId, messageIds } = data;
      if (!userId || !Array.isArray(messageIds) || messageIds.length === 0) return;

      if (selectedUser && String(selectedUser.id) === String(userId)) {
        setMessageList(prev =>
          prev.map(m =>
            messageIds.includes(String(m._id || m.id))
              ? { ...m, read: true }
              : m
          )
        );
      }
    };

    socket.on("receive_message", onReceiveMessage);
    socket.on("participant_updated", onParticipantUpdated);
    socket.on("messages_marked_read", onMessagesMarkedRead);
    socket.on("user_online", onUserOnline);
    socket.on("user_offline", onUserOffline);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("receive_message", onReceiveMessage);
      socket.off("participant_updated", onParticipantUpdated);
      socket.off("messages_marked_read", onMessagesMarkedRead);
      socket.off("user_online", onUserOnline);
      socket.off("user_offline", onUserOffline);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket, selectedUser]);

  // --- Auto scroll to bottom ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageList]);

  // --- Send message ---
  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedUser) return;

    try {
      const res = await fetch(`${SOCKET_URL}/chat/send/admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({
          toUserId: selectedUser.id,
          message: inputMessage.trim()
        }),
      });

      if (res.ok) {
        setInputMessage("");
      } else if (res.status === 401 || res.status === 403) {
        navigate('/login');
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className={`admin-chat-container ${isFullScreen ? 'fullscreen' : ''}`}>
      <button
        aria-label="Close chat"
        onClick={() => navigate(-1)}
        className="chat-close-button"
      >
        ×
      </button>

      <button
        aria-label="Toggle fullscreen"
        onClick={() => setIsFullScreen(!isFullScreen)}
        className="chat-fullscreen-button"
        title={isFullScreen ? "Thu nhỏ" : "Phóng to"}
      >
        {isFullScreen ? '⛶' : '⛶'}
      </button>

      {/* --- Sidebar --- */}
      <div className="chat-sidebar">
        <h3 className="sidebar-title">👥 Người dùng ({participants.length})</h3>
        {participants.length === 0 ? (
          <p className="sidebar-empty">Chưa có cuộc trò chuyện nào</p>
        ) : (
          participants.map((u) => (
            <SidebarUser
              key={u.id}
              u={u}
              isSelected={selectedUser?.id === u.id}
              onSelect={setSelectedUser}
              unreadCount={u.unreadCount || 0}
            />
          ))
        )}
      </div>

      {/* --- Chat section --- */}
      <div className="chat-main">
        {selectedUser ? (
          <>
            <div className="chat-header">
              <img
                src={selectedUser?.avatar || DEFAULT_AVATAR}
                alt={selectedUser?.name || 'avatar'}
                className="chat-header-avatar"
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3>{selectedUser.name}</h3>
                <small style={{ color: '#666', fontSize: 12 }}>{selectedUser?.email || ''}</small>
              </div>
            </div>

            <div className="chat-messages-container">
              {messageList.map((msg, i) => (
                <MessageItem
                  key={msg._id || msg.id || i}
                  msg={msg}
                  selectedUser={selectedUser}
                  defaultAvatar={DEFAULT_AVATAR}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-container">
              <input
                type="text"
                placeholder="Nhập tin nhắn..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="chat-input"
              />
              <button onClick={sendMessage} className="chat-send-button">
                Gửi
              </button>
            </div>
          </>
        ) : (
          <div className="chat-empty">
            🗨️ Chọn một user để bắt đầu trò chuyện
          </div>
        )}
      </div>
    </div>
  );
}