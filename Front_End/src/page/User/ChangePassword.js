import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../CSS/profile.css';
import { changePassword } from '../../service/account.service';
import Toast from '../../components/Toast';

export default function ChangePassword() {
  const raw = sessionStorage.getItem('user');
  const user = raw ? JSON.parse(raw) : null;
  const accountId = user?.id || user?._id || user?.accountId || null;
  const navigate = useNavigate();

  const [pw, setPw] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [toast, setToast] = useState({ message: '', type: '' });

  const handleChange = (e) => setPw({ ...pw, [e.target.name]: e.target.value });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!pw.oldPassword || !pw.newPassword) {
      setToast({ message: 'Vui lòng nhập đầy đủ thông tin', type: 'warning' });
      return;
    }

    if (pw.newPassword !== pw.confirmPassword) {
      setToast({ message: 'Mật khẩu xác nhận không khớp', type: 'warning' });
      return;
    }

    if (pw.newPassword.length < 6) {
      setToast({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự', type: 'warning' });
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      if (!token || !accountId) {
        setToast({ message: 'Vui lòng đăng nhập lại', type: 'warning' });
        return;
      }
      await changePassword(token, accountId, pw.oldPassword, pw.newPassword);
      setToast({ message: 'Đổi mật khẩu thành công', type: 'success' });
      setPw({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('changePassword', err);
      setToast({ message: err?.message || 'Lỗi khi đổi mật khẩu', type: 'warning' });
    }
  };

  if (!user) return <div className="container mt-4">Vui lòng đăng nhập để đổi mật khẩu.</div>;

  return (
    <div className="container mt-4 profile-container">
      <button className="btn-back" onClick={() => navigate(-1)}>←</button>
      <h2 className="mb-4">Đổi mật khẩu</h2>
      <div className="row">
        <div className="col-md-6 mx-auto">
          <div className="profile-card card">
            <div className="card-body">
              <form onSubmit={handleChangePassword}>

                <div className="mb-3">
                  <label className="form-label">Mật khẩu hiện tại</label>
                  <input
                    name="oldPassword"
                    type="password"
                    placeholder="Nhập mật khẩu hiện tại"
                    value={pw.oldPassword || ''}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Mật khẩu mới</label>
                  <input
                    name="newPassword"
                    type="password"
                    placeholder="Nhập mật khẩu mới"
                    value={pw.newPassword || ''}
                    onChange={handleChange}
                    className="form-control"
                    require
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Xác nhận mật khẩu mới</label>
                  <input
                    name="confirmPassword"
                    type="password"
                    placeholder="Nhập lại mật khẩu mới"
                    value={pw.confirmPassword || ''}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>

                <div className="d-grid">
                  <button className="btn btn-primary" type="submit">
                    Đổi mật khẩu
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      )}
    </div>
  );
}
