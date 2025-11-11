import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../../service/auth.service";
import Toast from "../../components/Toast";
import Loading from "../../components/Loading";
import "../../CSS/auth.css";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "", fullname: "", phone: "", email: "", role: "user" });
  const [toast, setToast] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await register(form);
      if (data && data.success) {
        setToast({ message: data.message || "Đăng ký thành công! Đang chuyển đến trang đăng nhập...", type: "success" });
        // Chờ 1.2s để user thấy rõ thông báo trước khi chuyển trang
        setTimeout(() => {
          navigate('/login');
        }, 1000);
      } else {
        setToast({ message: data.message || "Lỗi đăng ký", type: "error" });
        setLoading(false);
      }
    } catch (err) {
      setToast({ message: err.message || "Lỗi kết nối", type: "error" });
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper-alt">
      {loading && <Loading message="Đang đăng ký" />}
      <div className="auth-split">
          <div className="auth-card-alt">
            <h2 style={{ textAlign: 'center' }}>Đăng ký</h2>
            <form onSubmit={handleSubmit}>
              <input className="auth-input" name="username" placeholder="Username" value={form.username} onChange={handleChange} required />
              <input className="auth-input" name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
              <input className="auth-input" name="fullname" placeholder="Họ và tên" value={form.fullname} onChange={handleChange} required />
              <input className="auth-input" name="phone" placeholder="Số điện thoại" value={form.phone} onChange={handleChange} required />
              <input className="auth-input" name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
              <button className="auth-button" type="submit" disabled={loading}>
                {loading ? 'Đang đăng ký...' : 'Đăng ký'}
              </button>
            </form>
            <a className="auth-link" href="/login">Đã có tài khoản? Đăng nhập</a>
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
