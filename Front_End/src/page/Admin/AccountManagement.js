// Tên file: src/components/admin/AccountManagement.js
import React, { useState, useEffect } from 'react';
// 1. Chỉ import service của Account
import { listAccounts, createAccount, updateAccount, deleteAccount } from '../../service/account.service';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Loading from '../../components/Loading';

// 2. Đổi tên component
export default function AccountManagement({ token }) {
  // fallback to localStorage when token prop is not provided
  const effectiveToken = token || sessionStorage.getItem('token');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 3. Giữ lại state của Account
  const [users, setUsers] = useState([]);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [currentAccountForm, setCurrentAccountForm] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });

  // 4. Xóa state của Profile

  useEffect(() => {
    loadUsers(); // Chỉ load user
  }, []);

  // 5. Xóa hàm loadData() và loadUserProfiles()

  const loadUsers = async () => {
    setLoading(true);
    try {
  const usersList = await listAccounts(effectiveToken);
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Logic CRUD của Account  ---
  const openAccountForm = (acc = null) => {
    if (acc) {
      setCurrentAccountForm({ _id: acc._id, username: acc.username, role: acc.role });
    } else {
      setCurrentAccountForm({ username: '', password: '', role: 'user' });
    }
    setShowAccountModal(true);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const username = (formData.get('username') || '').toString().trim();
    const password = (formData.get('password') || '').toString();
    const role = (formData.get('role') || 'user').toString();

    if (!username) { setToast({ message: 'Username required', type: 'warning' }); return; }
    setLoading(true);
    try {
      if (currentAccountForm && currentAccountForm._id) {
        await updateAccount(effectiveToken, currentAccountForm._id, { username, role, ...(password ? { password } : {}) });
        setToast({ message: 'Cập nhật tài khoản thành công', type: 'success' });
      } else {
        if (!password) { setToast({ message: 'Password required for new account', type: 'warning' }); setLoading(false); return; }
        await createAccount(effectiveToken, { username, password, role });
        setToast({ message: 'Tạo tài khoản thành công', type: 'success' });
      }
      setShowAccountModal(false);
      setCurrentAccountForm(null);
      await loadUsers(); 
    } catch (err) {
      console.error('Error saving account', err);
      setToast({ message: 'Lỗi khi lưu tài khoản: ' + (err.message || err), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (accountId) => {
    setItemToDelete(accountId);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      await deleteAccount(effectiveToken, itemToDelete);
      await loadUsers(); 
      setToast({ message: 'Xóa tài khoản thành công', type: 'success' });
    } catch (err) {
      console.error('Delete account failed', err);
      setToast({ message: 'Lỗi khi xóa tài khoản: ' + (err.message || err), type: 'error' });
    } finally {
      setLoading(false);
      setItemToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirmModal(false);
    setItemToDelete(null);
  };

  const q = searchQuery.toLowerCase();
  const filteredUsers = users.filter(u => !searchQuery || (u.username || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q));

  return (
    <>
      <div style={{ position: 'relative' }}>
        {loading && <Loading />}
        <div className="section-header">
          <h3>Quản lý Tài khoản</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="form-control form-control-sm" placeholder="Tìm kiếm tài khoản..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <button type="button" className="btn-add-purple" onClick={() => openAccountForm(null)} aria-label="Thêm tài khoản">
              <span className="add-icon">+</span>
              <span>Thêm tài khoản</span>
            </button>
          </div>
        </div>
        <div className="admin-table-scroll">
          <table className="table table-hover" style={{ tableLayout: 'auto', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>ID</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Username</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Role</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(acc => (
                <tr key={acc._id}>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}><code>{acc._id}</code></td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{acc.username}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}><span className={`badge ${acc.role === 'admin' ? 'bg-danger' : 'bg-secondary'}`}>{acc.role}</span></td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }} >
                    <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <button className="btn btn-sm btn-warning me-1" onClick={() => openAccountForm(acc)}>Sửa</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteAccount(acc._id)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL Account */}
      {showAccountModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleSaveAccount}>
                <div className="modal-header">
                  <h5 className="modal-title">{currentAccountForm?._id ? 'Sửa tài khoản' : 'Tạo tài khoản'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAccountModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="form-group mb-2">
                    <label>Username</label>
                    <input name="username" className="form-control" defaultValue={currentAccountForm?.username} required />
                  </div>
                  <div className="form-group mb-2">
                    <label>Password {currentAccountForm?._id ? '(Để trống nếu không đổi)' : ''}</label>
                    <input name="password" type="password" className="form-control" required={!currentAccountForm?._id} />
                  </div>
                  <div className="form-group mb-2">
                    <label>Role</label>
                    <select name="role" className="form-select" defaultValue={currentAccountForm?.role || 'user'}>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAccountModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary">Lưu</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn xóa tài khoản này không? Profile liên quan cũng có thể bị ảnh hưởng. Hành động này không thể hoàn tác."
      />

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