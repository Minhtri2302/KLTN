import React, { useState } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from "../../service/auth.service";
import Toast from "../../components/Toast";
import Loading from "../../components/Loading";
import "../../CSS/auth.css";

export default function Login({ onAuth }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [toast, setToast] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Đang đăng nhập");

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.username, form.password);
      if (data.token) {
        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("user", JSON.stringify(data.user));
        setLoadingMessage("Đăng nhập thành công! Đang chuyển trang");
        setToast({ message: "Đăng nhập thành công", type: "success" });
        if (onAuth) onAuth(data.user);
        // Chuyển trang ngay lập tức
        if (data.user && data.user.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          const from = location.state && location.state.from ? location.state.from : '/';
          navigate(from, { replace: true });
        }
      } else {
        setToast({ message: data.message || "Lỗi đăng nhập", type: "error" });
        setLoading(false);
      }
    } catch (err) {
      setToast({ message: "Lỗi kết nối", type: "error" });
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper-alt auth-hero">
      {loading && <Loading message={loadingMessage} />}
      <div className="auth-split">
          <div className="auth-card-alt">
            <h2 style={{ textAlign: 'center' }}>Đăng nhập</h2>
            <form onSubmit={handleSubmit}>
              <input className="auth-input" name="username" placeholder="Username" value={form.username} onChange={handleChange} required />
              <input className="auth-input" name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
              <button className="auth-button" type="submit" disabled={loading}>
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>
            <a className="auth-link" href="/register">Chưa có tài khoản? Đăng ký</a>
          </div>
        </div>
      
      {/* Toast Notification */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: '' })}
        />
      )}
      </div>
  );
}
