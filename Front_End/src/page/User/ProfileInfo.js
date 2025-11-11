import React, { useEffect, useState, useRef } from 'react';
import '../../CSS/profile.css';
import { NavLink, useNavigate } from 'react-router-dom';
import { getUserById } from '../../service/account.service';
import { getProfileByAccountId, createProfile, updateProfile, uploadImage } from '../../service/profile.service';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Loading from '../../components/Loading';

export default function ProfileInfo() {
  const raw = sessionStorage.getItem('user');
  const user = raw ? JSON.parse(raw) : null;
  const accountId = user?.id || user?._id || user?.accountId || null;
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const avatarInputRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [editProfile, setEditProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    gender: '',
    dateOfBirth: ''
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (!accountId) {
      setLoading(false);
      return;
    }
    const token = sessionStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const accResp = await getUserById(token, accountId).catch(() => null);
        const acc = accResp && accResp.data ? accResp.data : accResp;
        if (acc) {
          let resolvedProfile = acc.profile || null;
          if (!resolvedProfile) {
            try {
              const rawLs = sessionStorage.getItem('user');
              const ls = rawLs ? JSON.parse(rawLs) : null;
              if (ls && ls.profile) resolvedProfile = ls.profile;
            } catch (err) {
              console.log('LocalStorage profile fetch failed', err);
            }
          }

          if (!resolvedProfile) {
            try {
              const profileRes = await getProfileByAccountId(token, accountId).catch(() => null);
              if (profileRes) resolvedProfile = profileRes;
            } catch (e) {
              console.warn('Profile fallback fetch failed', e);
            }
          }

          const finalProfile = resolvedProfile || (acc && acc.profile) || null;
          setProfile(finalProfile || null);

          // Initialize form with existing data
          if (finalProfile) {
            setEditProfile({
              name: finalProfile.name || '',
              email: finalProfile.email || '',
              phone: finalProfile.phone || '',
              address: finalProfile.address || '',
              gender: finalProfile.gender || '',
              dateOfBirth: finalProfile.dateOfBirth ? new Date(finalProfile.dateOfBirth).toISOString().split('T')[0] : ''
            });
          } else {
            setEditProfile({
              name: '',
              email: '',
              phone: '',
              address: '',
              gender: '',
              dateOfBirth: ''
            });
          }

          const initialAvatar = (finalProfile && (finalProfile.avatar || finalProfile.image)) || (acc && acc.avatar) || (acc && acc.profile && acc.profile.avatar) || (user && (user.avatar || user.profile && user.profile.avatar));
          setAvatarPreview(initialAvatar || '');
        }
      } catch (err) {
        console.error('Profile load error', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [accountId]);

  const handleAvatarSelect = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setAvatarFile(f);
    try {
      const url = URL.createObjectURL(f);
      setAvatarPreview(url);
    } catch (err) {
      setAvatarPreview('');
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) {
      setToast({ show: true, message: 'Vui lòng chọn ảnh', type: 'warning' });
      return;
    }
    const token = sessionStorage.getItem('token');
    if (!token) {
      setToast({ show: true, message: 'Vui lòng đăng nhập', type: 'error' });
      return;
    }
    try {
      setUploading(true);
      const data = await uploadImage(token, avatarFile);
      const avatarUrl = data && (data.url || data.secure_url || data.data?.url) || '';
      if (!avatarUrl) throw new Error('Không nhận được url ảnh từ server');

      // Tạo payload với avatar mới
      const payload = {
        ...editProfile,
        accountId,
        avatar: avatarUrl
      };

      // Luôn update profile nếu đã có, hoặc tạo mới nếu chưa có
      let updatedProfile;
      if (profile && (profile._id || profile.id)) {
        const id = profile._id || profile.id;
        updatedProfile = await updateProfile(token, id, payload);
      } else {
        updatedProfile = await createProfile(token, payload);
      }

      setProfile(updatedProfile);
      setEditProfile({
        name: updatedProfile.name || '',
        email: updatedProfile.email || '',
        phone: updatedProfile.phone || '',
        address: updatedProfile.address || '',
        gender: updatedProfile.gender || '',
        dateOfBirth: updatedProfile.dateOfBirth ? new Date(updatedProfile.dateOfBirth).toISOString().split('T')[0] : ''
      });
      setAvatarPreview(avatarUrl);

      try {
        const raw = sessionStorage.getItem('user');
        if (raw) {
          const u = JSON.parse(raw);
          u.profile = updatedProfile;
          sessionStorage.setItem('user', JSON.stringify(u));
        }
      } catch (e) { }

      setToast({ show: true, message: 'Ảnh đại diện đã được cập nhật', type: 'success' });
      try {
        if (avatarPreview && avatarPreview.startsWith('blob:')) {
          URL.revokeObjectURL(avatarPreview);
        }
      } catch (e) { }
      setAvatarFile(null);
      if (avatarInputRef && avatarInputRef.current) avatarInputRef.current.value = '';
    } catch (err) {
      console.error('uploadAvatar', err);
      setToast({ show: true, message: err?.message || 'Lỗi khi upload ảnh', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const token = sessionStorage.getItem('token');
    if (!token) {
      setToast({ show: true, message: 'Vui lòng đăng nhập', type: 'error' });
      setSaving(false);
      return;
    }
    try {
      const payload = {
        ...editProfile,
        accountId
      };

      if (profile && (profile._id || profile.id)) {
        const id = profile._id || profile.id;
        const data = await updateProfile(token, id, payload);
        setProfile(data);
        try {
          const raw = sessionStorage.getItem('user');
          if (raw) {
            const u = JSON.parse(raw);
            u.profile = data;
            sessionStorage.setItem('user', JSON.stringify(u));
          }
        } catch (e) { }
        setToast({ show: true, message: 'Cập nhật thông tin thành công', type: 'success' });
      } else {
        const data = await createProfile(token, payload);
        setProfile(data);
        try {
          const raw = sessionStorage.getItem('user');
          if (raw) {
            const u = JSON.parse(raw);
            u.profile = data;
            sessionStorage.setItem('user', JSON.stringify(u));
          }
        } catch (e) { }
        setToast({ show: true, message: 'Lưu thông tin thành công', type: 'success' });
      }
      setEditing(false);
    } catch (err) {
      console.error('saveProfile', err);
      setToast({ show: true, message: err?.message || 'Lỗi khi lưu hồ sơ', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    setLoggingOut(true);
    
    // Clear session storage
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    
    // Show toast
    setToast({ show: true, message: 'Đăng xuất thành công!', type: 'success' });
    
    // Navigate after delay (keep loading state until navigation completes)
    navigate('/login');

  };

  if (!user) return <div className="container mt-4">Vui lòng đăng nhập để xem hồ sơ.</div>;

  return (
    <div className="container-fluid mt-4 profile-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {loading && <Loading />}
      {uploading && <Loading message="Đang tải ảnh..." />}
      {saving && <Loading message="Đang lưu thông tin..." />}
      {loggingOut && <Loading message="Đang đăng xuất" />}

      <h2 className="mb-4">Tài khoản của tôi</h2>
      <div className="row">
        {/* Menu bên trái */}
        <div className="col-lg-2 col-md-3 mb-4">
          <div className="card" style={{ position: 'sticky', top: 20 }}>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="menu-item">
                <NavLink to="/profileinfo" end className={({ isActive }) => `menu-btn ${isActive ? 'active' : ''}`}>
                  <span style={{ fontSize: 20, marginRight: 8 }}></span> Thông tin cá nhân
                </NavLink>
              </div>
              <div className="menu-item">
                <NavLink to="/addresses" className={({ isActive }) => `menu-btn ${isActive ? 'active' : ''}`}>
                  <span style={{ fontSize: 20, marginRight: 8 }}></span> Quản lý địa chỉ
                </NavLink>
              </div>
              <div className="menu-item">
                <NavLink to="/change-password" className={({ isActive }) => `menu-btn ${isActive ? 'active' : ''}`}>
                  <span style={{ fontSize: 20, marginRight: 8 }}></span> Đổi mật khẩu
                </NavLink>
              </div>
              <div className="menu-item">
                <NavLink to="/orders" className={({ isActive }) => `menu-btn ${isActive ? 'active' : ''}`}>
                  <span style={{ fontSize: 20, marginRight: 8 }}></span> Lịch sử đơn hàng
                </NavLink>
              </div>
              <div className="menu-item">
                <button 
                  className="menu-btn w-100 text-start border-0 bg-transparent"
                  onClick={() => setShowLogoutModal(true)}
                  style={{ cursor: 'pointer' }}
                >
                  <span style={{ fontSize: 20, marginRight: 8 }}></span> Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Nội dung chính */}
        <div className="col-lg-10 col-md-9">
      <div className="row">
        <div className="col-md-4 mb-4">
          <div className="profile-card card">
            <div className="card-body">
              <h4 className="card-title">Ảnh đại diện</h4>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 150, height: 150, borderRadius: '50%', overflow: 'hidden', background: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ color: '#999' }}>No avatar</div>
                  )}
                </div>
                <div style={{ width: '100%' }}>
                  <p style={{ margin: 0, textAlign: 'center', marginBottom: 10 }}>
                    <strong>Username:</strong> {user.username}
                  </p>
                  <input
                    ref={avatarInputRef}
                    id="avatarInput"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    style={{ display: 'none' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                    <button
                      className="btn btn-primary w-100"
                      onClick={() => avatarInputRef.current && avatarInputRef.current.click()}
                      disabled={uploading}
                    >
                      Chọn ảnh
                    </button>
                    {avatarFile && <div style={{ fontSize: 13 }}>{avatarFile.name}</div>}
                    {avatarFile && (
                      <button
                        className="btn btn-success w-100"
                        onClick={handleUploadAvatar}
                        disabled={uploading}
                      >
                        Upload avatar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="profile-card card">
            <div className="card-body">
              <h4 className="card-title">Thông tin cá nhân</h4>
              {loading ? (
                <div>Đang tải...</div>
              ) : (
                <form>
                  <div className="mb-3">
                    <label className="form-label">Họ và tên</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nguyễn Văn A"
                      value={editProfile.name}
                      onChange={(e) => setEditProfile(prev => ({ ...prev, name: e.target.value }))}
                      disabled={!editing}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="example@gmail.com"
                      value={editProfile.email}
                      onChange={(e) => setEditProfile(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!editing}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Số điện thoại</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={editProfile.phone}
                      onChange={(e) => setEditProfile(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!editing}
                    />
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Giới tính</label>
                      <select
                        className="form-select"
                        value={editProfile.gender}
                        onChange={(e) => setEditProfile(prev => ({ ...prev, gender: e.target.value }))}
                        disabled={!editing}
                      >
                        <option value="">Chọn giới tính</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Ngày sinh</label>
                      <input
                        type="date"
                        className="form-control"
                        value={editProfile.dateOfBirth}
                        onChange={(e) => setEditProfile(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                        disabled={!editing}
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    {!editing ? (
                      <button
                        type="button"
                        className="btn btn-primary px-5"
                        onClick={() => setEditing(true)}
                        style={{ background: '#e91e63', border: 'none', borderRadius: '25px', padding: '10px 40px' }}
                      >
                        Chỉnh sửa
                      </button>
                    ) : (
                      <div className="d-flex justify-content-center gap-2">
                        <button
                          type="button"
                          className="btn btn-primary px-4"
                          onClick={handleSave}
                          disabled={saving}
                          style={{ background: '#e91e63', border: 'none', borderRadius: '25px', padding: '10px 30px' }}
                        >
                          Lưu thông tin
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary px-4"
                          onClick={() => {
                            setEditing(false);
                            setAvatarFile(null);
                            // Reset form về dữ liệu gốc
                            if (profile) {
                              setEditProfile({
                                name: profile.name || '',
                                email: profile.email || '',
                                phone: profile.phone || '',
                                address: profile.address || '',
                                gender: profile.gender || '',
                                dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : ''
                              });
                            }
                          }}
                          disabled={saving}
                          style={{ borderRadius: '25px', padding: '10px 30px' }}
                        >
                          Hủy
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
        </div>
      </div>

      {/* Toast notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}

      {/* Confirm logout modal */}
      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Xác nhận đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất?"
      />
    </div>
  );
}
