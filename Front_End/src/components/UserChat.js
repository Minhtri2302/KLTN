import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import '../CSS/userChat.css';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export default function UserChat() {
  const [socket, setSocket] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [messageList, setMessageList] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  const TOKEN = sessionStorage.getItem('token');
  const userInfo = (() => {
    try { return JSON.parse(sessionStorage.getItem('user') || 'null'); } catch (e) { return null; }
  })();
  const myId = userInfo?.id || null;
  const myAvatar = userInfo?.profile?.avatar || userInfo?.avatar || userInfo?.avatarUrl || null;
  const DEFAULT_AVATAR = 'https://res.cloudinary.com/dyefelufh/image/upload/v1760624976/kltu_products/aajhzwjgaonpf3t6utfk.svg';

  const [myProfile] = useState({
    id: myId,
    name: userInfo?.profile?.name || userInfo?.name || 'Người dùng',
    avatar: myAvatar || DEFAULT_AVATAR,
  });
  const [adminProfile, setAdminProfile] = useState(null);
  const [adminOnline, setAdminOnline] = useState(false);
  const [adminOffline, setAdminOffline] = useState(false);

  const isOpenRef = useRef(isOpen);
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

  useEffect(() => {
    if (!TOKEN) return;

    if (!window.__USERCHAT_SOCKET) {
      window.__USERCHAT_SOCKET = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        auth: { token: TOKEN },
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      console.log(' Created global USERCHAT socket');
      window.__USERCHAT_SOCKET.on('connect', () => console.log(' Socket connected'));
      window.__USERCHAT_SOCKET.on('disconnect', () => console.log(' Socket disconnected'));
    }

    const s = window.__USERCHAT_SOCKET;
    setSocket(s);

    const onHistory = (history) => {
      const list = Array.isArray(history) ? history : [];
      const seen = new Set();
      const unique = [];

      for (let i = 0; i < list.length; i++) {
        const m = list[i];
        const id = m?._id || m?.id;
        if (id) {
          if (seen.has(String(id))) continue;
          seen.add(String(id));
          unique.push(m);
        } else {
          unique.push({ ...m, _tmpId: `tmp-${Date.now()}-${i}` });
        }
      }
      setMessageList(unique);

      try {
        const uc = unique.filter((m) => String(m.fromId) !== String(myId) && (m.read === false || m.read === undefined)).length;
        if (!isOpenRef.current) setUnreadCount(uc);
        else setUnreadCount(0);
      } catch (e) { /* ignore */ }
    };

    const onReceive = (data) => {
      setMessageList((list) => {
        const id = data?._id || data?.id;
        if (id && list.some((m) => String(m._id || m.id) === String(id))) return list;

        const item = id ? data : { ...data, _tmpId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
        const next = [...list, item];

        if (String(data.fromId) !== String(myId) && !isOpenRef.current) {
          setUnreadCount((v) => (Number.isFinite(v) ? v + 1 : 1));
        }
        return next;
      });
    };

    const onMessagesMarkedRead = (data) => {
      console.log('📖 Admin marked messages as read:', data);
      if (!data || !Array.isArray(data.messageIds) || data.messageIds.length === 0) {
        return;
      }
      const readMessageIds = new Set(data.messageIds.map(String));
      setMessageList((prevList) => {
        return prevList.map((msg) => {
          const fromMe = String(msg.fromId) === String(myId);
          const msgId = String(msg._id || msg.id);
          if (fromMe && readMessageIds.has(msgId)) {
            return { ...msg, read: true };
          }
          return msg;
        });
      });
    };

    const onAdminOnline = (data) => {
      console.log('🔔 admin_online', data);
      setAdminOnline(true);
      setAdminOffline(false);
    };

    const onAdminOffline = (data) => {
      console.log('🔕 admin_offline', data);
      setAdminOnline(false);
      setAdminOffline(true);
    };

    const onDisconnect = () => {
      console.log('❌ Socket disconnected - marking admin offline');
      setAdminOnline(false);
    };

    s.on('history', onHistory);
    s.on('receive_message', onReceive);
    s.on('messages_marked_read', onMessagesMarkedRead);
    s.on('admin_online', onAdminOnline);
    s.on('admin_offline', onAdminOffline);
    s.on('disconnect', onDisconnect);

    return () => {
      try {
        s.off('history', onHistory);
        s.off('receive_message', onReceive);
        s.off('messages_marked_read', onMessagesMarkedRead);
        s.off('admin_online', onAdminOnline);
        s.off('admin_offline', onAdminOffline);
        s.off('disconnect', onDisconnect);
      } catch (e) { }
    };
  }, [TOKEN, myId]);

  // 📱 GỬI TRẠNG THÁI CHAT WINDOW TỚI SERVER
  useEffect(() => {
    if (!socket) return;
    
    socket.emit('chat_window_status', { isOpen });
    console.log(`📱 Chat window status: ${isOpen ? 'OPEN' : 'CLOSED'}`);
  }, [socket, isOpen]);

  // 📖 AUTO MARK READ KHI MỞ CHAT
  useEffect(() => {
    if (!socket || !isOpen) return;

    // Gửi sự kiện để server mark read tất cả tin nhắn chưa đọc
    socket.emit('user_opened_chat');
    console.log('📖 Requested server to mark unread messages as read');
  }, [socket, isOpen]);

  // Lấy thông tin admin
  useEffect(() => {
    if (!TOKEN) return;
    (async () => {
      try {
        const res = await fetch(`${SOCKET_URL}/chat/admin-info`, {
          headers: { Authorization: `Bearer ${TOKEN}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAdminProfile({
            id: data.id,
            name: data.name || data.username,
            avatar: data.avatar || null,
          });
        }
      } catch { }
    })();
  }, [TOKEN]);

  // Tự cuộn xuống cuối
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messageList, isOpen]);

  // compute last message from me that has been read by admin
  const lastMySeenId = React.useMemo(() => {
    if (!messageList || !myId) return null;
    for (let i = messageList.length - 1; i >= 0; i--) {
      const m = messageList[i];
      if (String(m.fromId) === String(myId) && m.read) return String(m._id || m.id || m._tmpId || i);
    }
    return null;
  }, [messageList, myId]);

  // Mở chat thì tắt badge unread
  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  // Gửi tin nhắn
  const sendMessage = () => {
    if (!inputMessage.trim() || !TOKEN) return;
    const messageData = { message: inputMessage.trim() };

    (async () => {
      try {
        const res = await fetch(`${SOCKET_URL}/chat/send/user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${TOKEN}`,
          },
          body: JSON.stringify(messageData),
        });

        if (res.ok) {
          // Fire and forget
        } else {
          console.error("Failed to send message via API");
        }
      } catch (err) {
        console.error(err);
      }
    })();
    setInputMessage('');
  };

  const formatMsgTime = (msg) => {
    if (!msg) return '';
    const time = msg.createdAt || msg.time;
    if (!time) return '';
    const d = new Date(time);
    return isNaN(d) ? '' : d.toLocaleString();
  };

  if (!TOKEN) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        className={`userchat-open-button ${unreadCount > 0 ? 'unread' : ''}`}
        onClick={() => setIsOpen(true)}
      >
        💬
        {unreadCount > 0 && (
          <span className="userchat-unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
    );
  }

  return (
    <div className="userchat-container">
      <div className="userchat-header">
        <img
          src={(adminProfile && adminProfile.avatar) || DEFAULT_AVATAR}
          alt="avatar"
          className="userchat-header-avatar"
        />
        <div style={{ flex: 1 }}>
          <h3 className="userchat-header-title">{adminProfile ? adminProfile.name : myProfile.name}</h3>
          <p className="userchat-username-tag">
            {adminOnline && <span style={{ color: '#1aa260', fontSize: 15 }}>● Đang hoạt động</span>}
            {adminOffline && <span style={{ color: '#0a0a0aff', fontSize: 15 }}>● Không hoạt động</span>}
          </p>
        </div>

        <button
          className="userchat-close-button"
          onClick={() => setIsOpen(false)}
        >
          ×
        </button>
      </div>

      <div className="userchat-body">
        {messageList.map((msg, i) => {
          const fromMe = String(msg.fromId) === String(myId);
          
          // ✅ Xử lý avatar đồng nhất
          // Ưu tiên: msg.avatar (từ backend) → profile avatar → default
          const avatarSrc = fromMe 
            ? (msg.avatar || myProfile.avatar || DEFAULT_AVATAR)
            : (msg.avatar || adminProfile?.avatar || DEFAULT_AVATAR);
          
          const id = String(msg._id || msg.id || msg._tmpId || i);
          const showSeenAvatar = fromMe && msg.read && id === lastMySeenId;
          return (
            <div
              key={id}
              style={{
                display: 'flex',
                flexDirection: fromMe ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                marginBottom: 12,
              }}
            >
              {!fromMe && (
                <img src={avatarSrc} alt="avatar" className="userchat-msg-avatar" />
              )}

              <div className={`userchat-msg-bubble ${fromMe ? 'from-me' : 'from-other'}`}>
                <div className="userchat-msg-author">
                  {fromMe ? 'Bạn' : msg.author || 'Admin'}
                </div>
                {msg.message}
                <div className="userchat-msg-time">
                  {formatMsgTime(msg)}
                </div>
                {fromMe && msg.read && (
                  <div className="userchat-msg-read">
                    Đã xem
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      <div className="userchat-input-area">
        <input
          type="text"
          value={inputMessage}
          placeholder="Nhập tin nhắn..."
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          className="userchat-input"
        />
        <button onClick={sendMessage} className="userchat-send-button">Gửi</button>
      </div>
    </div>
  );
}