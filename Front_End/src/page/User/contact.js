import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import "../../CSS/contact.css";
import Toast from "../../components/Toast";
import Loading from "../../components/Loading";
import { createContact } from '../../service/contact.service';

export default function ContactPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let user = null;
    try { user = JSON.parse(sessionStorage.getItem('user')); } catch (err) { user = null; }
    if (!user) {
      navigate('/login', { state: { from: '/contact' } });
      return;
    }

    if (!form.name || !form.email || !form.message) {
      setToast({ message: 'Vui lòng điền đầy đủ thông tin.', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      // attach user id to the contact payload
      let payload = { ...form };
      if (user && (user._id || user.id)) payload.userId = user._id || user.id;
      await createContact(payload);
      setToast({ message: 'Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm.', type: 'success' });
      if (user) {
        setForm(f => ({ ...f, message: "" }));
      } else {
        setForm({ name: "", email: "", message: "" });
      }
    } catch (err) {
      console.error('submit contact', err);
      setToast({ message: err.message && err.message !== 'Error' ? err.message : 'Không thể gửi liên hệ. Vui lòng thử lại sau.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page container my-5">
      <h2>Liên hệ</h2>
      <p>Nếu bạn có câu hỏi hoặc cần hỗ trợ, hãy gửi thông tin cho chúng tôi.</p>

      <div className="row">
        <div className="col-md-6">
          <form className="contact-form" onSubmit={handleSubmit}>
            {/* Toast Notification */}
            {toast.message && (
              <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ message: '', type: '' })}
              />
            )}
            {loading && <Loading message="Đang gửi" />}
            <div className="mb-3">
              <input name="name" value={form.name} onChange={handleChange} className="form-control" placeholder="Họ và tên" />
            </div>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input name="email" value={form.email} onChange={handleChange} className="form-control" placeholder="Email" />
            </div>
            <div className="mb-3">
              <label className="form-label">Lời nhắn</label>
              <textarea name="message" value={form.message} onChange={handleChange} className="form-control" rows={6} />
            </div>
            <button className="btn btn-primary">Gửi liên hệ</button>
          </form>
        </div>

        <div className="col-md-6">
          <div className="contact-info p-3">
            <h5>Thông tin shop</h5>
            <p><strong>Địa chỉ:</strong> QL1A, An Phú Đông, Quận 12</p>
            <p><strong>Email:</strong>minhtri2322004@gmail.com</p>
            <p><strong>Hotline:</strong> 0898032180</p>
          </div>
        </div>
      </div>
    </div>
  );
}
