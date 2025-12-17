// Tên file: src/components/admin/AccountManagement.js
import React, { useState, useEffect } from 'react';
// 1. Chỉ import service của Account
import { listAccounts } from '../../service/account.service';
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

  const q = searchQuery.toLowerCase();
  const filteredUsers = users.filter(u => !searchQuery || (u.username || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q));

  return (
    <>
      <div style={{ position: 'relative' }}>
        {loading && <Loading />}
        <div className="section-header">
          <h3>Quản lý Tài khoản</h3>
          <div>
            <input className="form-control form-control-sm" placeholder="Tìm kiếm tài khoản..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="admin-table-scroll">
          <table className="table table-hover" style={{ tableLayout: 'auto', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>ID</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Username</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Role</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(acc => (
                <tr key={acc._id}>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}><code>{acc._id}</code></td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{acc.username}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}><span className={`badge ${acc.role === 'admin' ? 'bg-danger' : 'bg-secondary'}`}>{acc.role}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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