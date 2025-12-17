import React, { useState, useEffect } from 'react';
import { listProfiles, createProfile, updateProfile, uploadImage as uploadProfileImage } from '../../service/profile.service';
import { listAccounts } from '../../service/account.service';
import Toast from '../../components/Toast';
import Loading from '../../components/Loading';

export default function ProfileManagement({ token }) {
  const effectiveToken = token || sessionStorage.getItem('token');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userProfiles, setUserProfiles] = useState([]);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [accountsList, setAccountsList] = useState([]);
  const [toast, setToast] = useState({ message: '', type: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
  const [profiles, accounts] = await Promise.all([listProfiles(effectiveToken), listAccounts(effectiveToken)]);
      setUserProfiles(profiles || []);
      setAccountsList(accounts || []);
    } catch (err) {
      console.error('Error loading profiles/accounts', err);
      setUserProfiles([]);
      setAccountsList([]);
    } finally { setLoading(false); }
  };

  const openUserProfileForm = (profile = null, viewOnly = false) => {
    if (profile) {
      setCurrentUserProfile({ ...profile, viewOnly });
    } else {
      setCurrentUserProfile({ accountId: accountsList[0]?._id || '', name: '', email: '', phone: '', viewOnly });
    }
    setShowUserProfileModal(true);
  };

  const handleSaveUserProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target; const formData = new FormData(form);
    const name = (formData.get('name') || '').toString().trim();
    const email = (formData.get('email') || '').toString().trim();
    const phone = (formData.get('phone') || '').toString().trim();
    const accountId = (formData.get('accountId') || '').toString().trim();
    if (!name) { setToast({ message: 'Tên bắt buộc', type: 'warning' }); setLoading(false); return; }
    if (!accountId) { setToast({ message: 'Account ID bắt buộc', type: 'warning' }); setLoading(false); return; }

    try {
      let avatarUrl = currentUserProfile?.avatar || '';
      const fileInput = form.querySelector('input[name="avatar"]');
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const uploadData = await uploadProfileImage(effectiveToken, file);
        avatarUrl = uploadData?.url || uploadData?.secure_url || avatarUrl;
      }

      const body = { name, email, phone, accountId };
      if (avatarUrl) body.avatar = avatarUrl;
      
      // Giữ nguyên addresses nếu có (không cho phép sửa trong modal này)
      if (currentUserProfile?.addresses) {
        body.addresses = currentUserProfile.addresses;
      }

      if (currentUserProfile && (currentUserProfile._id || currentUserProfile.id)) {
        const id = currentUserProfile._id || currentUserProfile.id;
        await updateProfile(effectiveToken, id, body);
        setToast({ message: 'Cập nhật hồ sơ thành công', type: 'success' });
      } else {
        await createProfile(effectiveToken, body);
        setToast({ message: 'Tạo hồ sơ thành công', type: 'success' });
      }
      setShowUserProfileModal(false); setCurrentUserProfile(null); await loadData();
    } catch (err) { console.error('Error saving user profile', err); setToast({ message: 'Lỗi khi lưu hồ sơ', type: 'error' }); }
    finally { setLoading(false); }
  };

  const q = searchQuery.toLowerCase();
  const filteredProfiles = userProfiles.filter(p => !searchQuery || (p.name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q) || (p.phone || '').toLowerCase().includes(q));

  return (
    <>
      <div style={{ position: 'relative', maxWidth: '1400px', margin: '0 auto' }}>
        {loading && <Loading />}
        <div className="section-header">
          <h3>Quản lý Hồ sơ</h3>
          <div>
            <input className="form-control form-control-sm" placeholder="Tìm hồ sơ..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="admin-table-scroll">
          <table className="table table-hover" style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: '80px', verticalAlign: 'middle', textAlign: 'center' }}>Avatar</th>
                <th style={{ width: '150px', verticalAlign: 'middle', textAlign: 'center' }}>Tên</th>
                <th style={{ width: '180px', verticalAlign: 'middle', textAlign: 'center' }}>Email</th>
                <th style={{ width: '120px', verticalAlign: 'middle', textAlign: 'center' }}>Phone</th>
                <th style={{ width: '80px', verticalAlign: 'middle', textAlign: 'center' }}>Giới tính</th>
                <th style={{ width: '100px', verticalAlign: 'middle', textAlign: 'center' }}>Ngày sinh</th>
                <th style={{ width: '100px', verticalAlign: 'middle', textAlign: 'center' }}>Địa chỉ</th>
                <th style={{ width: '150px', verticalAlign: 'middle', textAlign: 'center' }}>Account ID</th>
                <th style={{ width: '120px', verticalAlign: 'middle', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map(p => (
                <tr key={p._id}>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}><img src={p.avatar} alt={p.name} className="product-image-preview" style={{ maxWidth: 60, maxHeight: 60 }} /></td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.name}>{p.name}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.email}>{p.email}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>{p.phone}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{p.gender || <span style={{ color: '#999' }}>-</span>}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('vi-VN') : <span style={{ color: '#999' }}>-</span>}
                  </td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {p.addresses && p.addresses.length > 0 ? (
                      <span title={p.addresses.map(a => `${a.street}, ${a.ward}, ${a.district}, ${a.city}`.replace(/, ,/g, ',').replace(/^,|,$/g, '')).join(' | ')}>
                        {p.addresses.length} địa chỉ
                      </span>
                    ) : (
                      <span style={{ color: '#999' }}>Chưa có</span>
                    )}
                  </td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><code title={p.accountId}>{p.accountId}</code></td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }} >
                    <button className="btn btn-sm btn-info" onClick={() => openUserProfileForm(p, true)}>Xem</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modal */}
      {showUserProfileModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Xem thông tin hồ sơ</h5>
                <button type="button" className="btn-close" onClick={() => setShowUserProfileModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="form-group mb-2">
                  <label>Account ID (Liên kết với tài khoản)</label>
                  <input className="form-control" value={currentUserProfile?.accountId || ''} readOnly />
                </div>
                <div className="form-group mb-2">
                  <label>Tên</label>
                  <input className="form-control" value={currentUserProfile?.name || ''} readOnly />
                </div>
                <div className="row">
                  <div className="col-md-6 form-group mb-2">
                    <label>Email</label>
                    <input className="form-control" value={currentUserProfile?.email || ''} readOnly />
                  </div>
                  <div className="col-md-6 form-group mb-2">
                    <label>Phone</label>
                    <input className="form-control" value={currentUserProfile?.phone || ''} readOnly />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 form-group mb-2">
                    <label>Giới tính</label>
                    <input className="form-control" value={currentUserProfile?.gender || 'Chưa cập nhật'} readOnly />
                  </div>
                  <div className="col-md-6 form-group mb-2">
                    <label>Ngày sinh</label>
                    <input className="form-control" value={currentUserProfile?.dateOfBirth ? new Date(currentUserProfile.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'} readOnly />
                  </div>
                </div>
                <div className="form-group mb-2">
                  <label>Địa chỉ cá nhân</label>
                  <input className="form-control" value={currentUserProfile?.address || 'Chưa cập nhật'} readOnly />
                </div>
                <div className="form-group mb-2">
                  <label>Avatar</label>
                  {currentUserProfile?.avatar && (
                    <div>
                      <img src={currentUserProfile.avatar} alt="Avatar" style={{maxWidth: 100, maxHeight: 100, marginTop: 10}} />
                    </div>
                  )}
                  {!currentUserProfile?.avatar && <p className="text-muted">Chưa có avatar</p>}
                </div>
                
                {/* Hiển thị danh sách địa chỉ (chỉ đọc) */}
                {currentUserProfile?.addresses && currentUserProfile.addresses.length > 0 && (
                  <div className="form-group mb-2">
                    <label>Địa chỉ đã lưu ({currentUserProfile.addresses.length})</label>
                    <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: 4, padding: 8 }}>
                      {currentUserProfile.addresses.map((addr, idx) => (
                        <div key={addr._id || idx} style={{ padding: '8px 0', borderBottom: idx < currentUserProfile.addresses.length - 1 ? '1px solid #eee' : 'none' }}>
                          <div><strong>{addr.fullName}</strong> - {addr.phone}</div>
                          {addr.email && <div style={{ fontSize: '0.85em', color: '#555' }}>Email: {addr.email}</div>}
                          <div style={{ fontSize: '0.9em', color: '#666' }}>
                            {[addr.street, addr.ward, addr.district, addr.city].filter(Boolean).join(', ') || 'Chưa đầy đủ'}
                          </div>
                          {addr.isDefault && <span style={{ fontSize: '0.8em', color: '#0d6efd', fontWeight: 'bold' }}>Mặc định</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {(!currentUserProfile?.addresses || currentUserProfile.addresses.length === 0) && (
                  <div className="form-group mb-2">
                    <label>Địa chỉ</label>
                    <p className="text-muted">Chưa có địa chỉ nào</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUserProfileModal(false)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: '' })}
        />
      )}
    </>
  );
}