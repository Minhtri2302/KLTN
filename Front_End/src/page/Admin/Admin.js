import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import '../../CSS/admin.css';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import { listProducts } from '../../service/product.service';
import { listOrders } from '../../service/order.service';
import { listAccounts } from '../../service/account.service';
import Loading from '../../components/Loading';

export default function Admin({ onLogout, children }) {
  const raw = sessionStorage.getItem('user');
  const user = raw ? JSON.parse(raw) : null;
  const token = sessionStorage.getItem('token');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
  });
  const [overviewOrders, setOverviewOrders] = useState([]);
  const [overviewProducts, setOverviewProducts] = useState([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [socket, setSocket] = useState(null);

  const baseUrl = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

  // ===========================================
  // ✨ SOCKET CONNECTION FOR REAL-TIME UPDATES
  // ===========================================
  useEffect(() => {
    if (!token) return;

    // Tạo socket connection (singleton pattern)
    if (!window.__ADMIN_DASHBOARD_SOCKET) {
      window.__ADMIN_DASHBOARD_SOCKET = io(baseUrl, {
        transports: ['websocket', 'polling'],
        auth: { token },
      });
      console.log('🔌 Created ADMIN_DASHBOARD socket');

      window.__ADMIN_DASHBOARD_SOCKET.on('connect', () => {
        console.log('✅ Admin dashboard socket connected');
        window.__ADMIN_DASHBOARD_SOCKET.emit('join_admin_room');
      });

      window.__ADMIN_DASHBOARD_SOCKET.on('disconnect', () => {
        console.log('❌ Admin dashboard socket disconnected');
      });
    }

    const s = window.__ADMIN_DASHBOARD_SOCKET;
    setSocket(s);

    return () => {
      setSocket(null);
    };
  }, [token, baseUrl]);

  // ===========================================
  // ✨ FETCH INITIAL UNREAD COUNT
  // ===========================================
  const fetchUnreadMessagesCount = async () => {
    const url = `${baseUrl.replace(/\/+$/, '')}/chat/participants`;
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const body = await res.text().catch(() => '<no body>');
        console.error(`Error fetching participants: ${res.status} ${res.statusText}`, body.slice(0, 1000));
        return;
      }

      const data = await res.json().catch(async (e) => {
        const txt = await res.text().catch(() => '<no body>');
        console.error('Participants endpoint did not return JSON. snippet:', txt.slice(0, 1000));
        return null;
      });

      if (Array.isArray(data)) {
        const total = data.reduce((s, p) => s + (p?.unreadCount || 0), 0);
        setUnreadMessagesCount(total);
      }
    } catch (err) {
      console.error('Error fetching unread messages count:', err);
    }
  };

  useEffect(() => {
    fetchUnreadMessagesCount();
  }, [token]);

  // ===========================================
  // ✨ LISTEN TO REAL-TIME SOCKET EVENTS
  // ===========================================
  useEffect(() => {
    if (!socket) return;

    // Khi có tin nhắn mới từ user → tăng unread count
    const onReceiveMessage = (msg) => {
      console.log('📨 New message received:', msg);

      // Chỉ tăng count nếu tin nhắn từ user (không phải từ admin)
      const fromUser = msg.fromId && msg.userId && String(msg.fromId) === String(msg.userId);

      if (fromUser) {
        setUnreadMessagesCount(prev => prev + 1);
      }
    };

    // Khi participant được update (unreadCount thay đổi)
    const onParticipantUpdated = (update) => {
      console.log('🔄 Participant updated:', update);

      // Re-fetch toàn bộ để có số chính xác
      fetchUnreadMessagesCount();
    };

    // Khi tin nhắn được đánh dấu đã đọc
    const onMessagesMarkedRead = (data) => {
      console.log('✅ Messages marked as read:', data);

      // Giảm unread count
      if (data.messageIds && Array.isArray(data.messageIds)) {
        setUnreadMessagesCount(prev => Math.max(0, prev - data.messageIds.length));
      }
    };

    // Khi user mở chat
    const onUserOpenedChat = (data) => {
      console.log('👀 User opened chat:', data);

      // Re-fetch để cập nhật chính xác
      fetchUnreadMessagesCount();
    };

    socket.on('receive_message', onReceiveMessage);
    socket.on('participant_updated', onParticipantUpdated);
    socket.on('messages_marked_read', onMessagesMarkedRead);
    socket.on('user_opened_chat', onUserOpenedChat);

    return () => {
      socket.off('receive_message', onReceiveMessage);
      socket.off('participant_updated', onParticipantUpdated);
      socket.off('messages_marked_read', onMessagesMarkedRead);
      socket.off('user_opened_chat', onUserOpenedChat);
    };
  }, [socket]);

  // ===========================================

  useEffect(() => {
    if (user && user.role === 'admin') {
      setLoading(true);
      loadOverviewData().finally(() => setLoading(false));
    }
  }, [user?.id]);

  const loadOverviewData = async () => {
    try {
      const [productsList, ordersList, usersList] = await Promise.all([
        listProducts(token),
        listOrders(token),
        listAccounts(token),
      ]);
      setOverviewProducts(productsList.slice(0, 5));
      setOverviewOrders(ordersList.slice(0, 5));
      const revenue = ordersList.reduce(
        (sum, order) => (order.totalAmount || order.total || 0) + sum,
        0
      );
      setStats({
        totalProducts: productsList.length,
        totalOrders: ordersList.length,
        totalUsers: usersList.length,
        totalRevenue: revenue,
      });
    } catch (error) {
      console.error('Error loading overview data:', error);
    }
  };

  const logout = () => {
    try {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    } catch (err) { }
    if (onLogout) onLogout();
    navigate('/login');
  };

  if (!user || user.role !== 'admin') {
    return <div className="container mt-4">Bạn không có quyền truy cập.</div>;
  }

  return (
    <div className="admin-dashboard">
      {loading && <Loading />}

      {/* Header */}
      <div className="admin-header">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>🎯 Bảng quản trị</h1>
              <p>Chào mừng, {user.username}</p>
            </div>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="btn btn-outline-light"
                  onClick={() => navigate('/admin/chat')}
                  title="Mở chat toàn màn hình"
                  style={{ position: 'relative' }}
                >
                  💬
                  {unreadMessagesCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -5,
                        right: -5,
                        backgroundColor: 'red',
                        color: 'white',
                        borderRadius: '50%',
                        padding: '2px 6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        minWidth: '20px',
                        textAlign: 'center',
                      }}
                    >
                      {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </span>
                  )}
                </button>
                <button className="btn btn-outline-light" onClick={logout}>
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="container pb-5">
        <div className="admin-layout" style={{ display: 'flex', gap: 20 }}>
          <aside className="admin-sidebar" style={{ width: 260 }}>
            <div className="sidebar-menu">
              <div className="menu-item">
                <NavLink to="/admin" end className={({ isActive }) => `menu-btn ${isActive ? 'active' : ''}`}>
                   Tổng quan
                </NavLink>
              </div>
              <div className="menu-item">
                <NavLink to="/admin/categories" className={({ isActive }) => `menu-btn ${isActive ? 'active' : ''}`}>
                   Danh mục
                </NavLink>
              </div>
              <div className="menu-item">
                <NavLink to="/admin/products" className={({ isActive }) => `menu-btn ${isActive ? 'active' : ''}`}>
                   Sản phẩm
                </NavLink>
              </div>
              <div className="menu-item">
                <NavLink to="/admin/orders" className={({ isActive }) => `menu-btn ${isActive ? 'active' : ''}`}>
                   Đơn hàng
                </NavLink>
              </div>
              <div className="menu-item">
                <NavLink to="/admin/users" className={({ isActive }) => `menu-btn ${isActive ? 'active' : ''}`}>
                   Người dùng
                </NavLink>
              </div>
              <div className="menu-item">
                <NavLink to="/admin/profiles" className={({ isActive }) => `menu-btn ${isActive ? 'active' : ''}`}>
                   Hồ sơ người dùng
                </NavLink>
              </div>
              <div className="menu-item">
                <NavLink to="/admin/banners" className={({ isActive }) => `menu-btn ${isActive ? 'active' : ''}`}>
                   Banners
                </NavLink>
              </div>
              <div className="menu-item">
                <NavLink to="/admin/news" className={({ isActive }) => `menu-btn ${isActive ? 'active' : ''}`}>
                   Tin tức
                </NavLink>
              </div>

              <div className="menu-item">
                <NavLink to="/admin/contacts" className={({ isActive }) => `menu-btn ${isActive ? 'active' : ''}`}>
                   Liên hệ
                </NavLink>
              </div>
              <div className="menu-item">
                <NavLink to="/admin/reviews" className={({ isActive }) => `menu-btn ${isActive ? 'active' : ''}`}>
                   Đánh giá
                </NavLink>
              </div>

            </div>
          </aside>

          <main className="admin-content" style={{ flex: 1 }}>
            {children ? (
              children
            ) : (
              <Outlet context={{ overviewOrders, overviewProducts, stats, token }} />
            )}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="admin-footer">
        <div className="admin-footer-content">
          <div className="admin-footer-info">
            <div className="admin-footer-brand">🚴 BikeShop Admin</div>
            <div className="admin-footer-copyright">
              © {new Date().getFullYear()} BikeShop. All rights reserved.
            </div>
          </div>
          <div className="admin-footer-links">
            <a href="/admin" className="admin-footer-link">Trang chủ</a>
            <a href="/admin/products" className="admin-footer-link">Sản phẩm</a>
            <a href="/admin/orders" className="admin-footer-link">Đơn hàng</a>
            <a href="/admin/contacts" className="admin-footer-link">Hỗ trợ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}