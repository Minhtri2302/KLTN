// Tên file: admin/ContactManagement.js

import React, { useState, useEffect } from 'react';
// Import service CẦN THIẾT
import { getContacts, deleteContact as deleteContactApi } from '../../service/contact.service';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Loading from '../../components/Loading';

export default function ContactManagement({ token }) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [currentContact, setCurrentContact] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });

  useEffect(() => {
    loadContacts();
  }, []);

  // Logic CRUD (copy từ file gốc)
  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await getContacts();
      const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      setContacts(list);
    } catch (err) {
      console.error('Error loading contacts:', err);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };
  
  const openContact = (contact) => {
    setCurrentContact(contact || null);
    setShowContactModal(true);
  };

  const handleDeleteContact = async (contactId) => {
    setItemToDelete(contactId);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      await deleteContactApi(itemToDelete);
      await loadContacts();
      setToast({ message: 'Xóa liên hệ thành công', type: 'success' });
    } catch (err) { 
      console.error('Delete contact failed', err); 
      setToast({ message: 'Lỗi khi xóa liên hệ', type: 'error' });
    } finally { 
      setLoading(false);
      setItemToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirmModal(false);
    setItemToDelete(null);
  };

  const filteredContacts = contacts.filter(c => 
    !searchQuery || 
    (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      <div style={{ position: 'relative' }}>
        {loading && <Loading />}
        
        {/* JSX của Tab (copy từ file gốc) */}
        <div className="section-header">
          <h3>Quản lý liên hệ</h3>
          <div>
            <input className="form-control form-control-sm" placeholder="Tìm liên hệ theo tên hoặc email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>
  <div className="table-responsive product-table-scroll">
  <table className="table table-hover mt-3" style={{ tableLayout: 'auto', width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>#</th>
              <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Tên</th>
              <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Email</th>
              <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Lời nhắn</th>
              <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Ngày</th>
              <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.map((c, i) => (
              <tr key={c._id || i}>
                <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ verticalAlign: 'middle', textAlign: 'center', wordBreak: 'break-word' }}>{c.name}</td>
                <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{c.email}</td>
                <td style={{ maxWidth: 360, whiteSpace: 'normal', overflow: 'visible', wordBreak: 'break-word', textAlign: 'center' }} title={c.message || ''}>
                  {c.message ? (c.message.length > 120 ? c.message.slice(0, 120) + '…' : c.message) : ''}
                </td>
                <td style={{ minWidth: 160, verticalAlign: 'middle', textAlign: 'center' }}>{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</td>
                <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    <button className="btn btn-sm btn-warning me-1" onClick={() => openContact(c)}>Xem</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteContact(c._id)}>Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
  </table>
  </div>
      </div>

      {/* MODAL Xem Contact (Tái tạo) */}
      {showContactModal && currentContact && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Liên hệ từ: {currentContact.name}</h5>
                <button type="button" className="btn-close" onClick={() => setShowContactModal(false)}></button>
              </div>
              <div className="modal-body">
                <p><strong>Tên:</strong> {currentContact.name}</p>
                <p><strong>Email:</strong> {currentContact.email}</p>
                <p><strong>Ngày gửi:</strong> {currentContact.createdAt ? new Date(currentContact.createdAt).toLocaleString() : 'N/A'}</p>
                <hr/>
                <p><strong>Nội dung:</strong></p>
                <p style={{whiteSpace: 'pre-wrap'}}>{currentContact.message}</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowContactModal(false)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn xóa liên hệ này không? Hành động này không thể hoàn tác."
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