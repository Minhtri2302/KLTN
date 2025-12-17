import React, { useState, useEffect } from 'react';
// Import service CẦN THIẾT
import { listReviews, deleteReviewAdmin, updateReviewAdmin } from '../../service/review.service';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Loading from '../../components/Loading';

export default function ReviewManagement({ token }) {
  const effectiveToken = token || sessionStorage.getItem('token');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [reviews, setReviews] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });

  useEffect(() => {
    loadReviews();
  }, []);

  // Logic CRUD (copy từ file gốc)
  const loadReviews = async () => {
    setLoading(true);
    try {
      const list = await listReviews(effectiveToken);
      setReviews(list || []);
    } catch (err) {
      console.error('Error loading reviews', err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (id) => {
    setItemToDelete(id);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      await deleteReviewAdmin(effectiveToken, itemToDelete);
      await loadReviews();
      setToast({ message: 'Xóa đánh giá thành công', type: 'success' });
    } catch (err) {
      console.error('Delete review failed', err);
      setToast({ message: 'Lỗi khi xóa đánh giá', type: 'error' });
    } finally {
      setLoading(false);
      setItemToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirmModal(false);
    setItemToDelete(null);
  };

  const filteredReviews = (reviews || []).filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const productIdStr = typeof r.productId === 'object' ? (r.productId?._id || '') : (r.productId || '');
    const userIdStr = typeof r.userId === 'object' ? (r.userId?._id || '') : (r.userId || '');
    return (productIdStr && productIdStr.toLowerCase().includes(q)) ||
      (userIdStr && userIdStr.toLowerCase().includes(q)) ||
      (r.comment && r.comment.toLowerCase().includes(q));
  });

  return (
    <>
      <div style={{ position: 'relative' }}>
        {loading && <Loading />}

        <div className="section-header">
          <h3>Quản lý đánh giá</h3>
          <div style={{ maxWidth: 420, marginLeft: 'auto' }}>
          </div>
          <input
            className="form-control form-control-sm"
            placeholder="Tìm kiếm theo UserId, ProductId, Comment..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ borderRadius: 20, paddingLeft: 16, fontSize: 15, width: 400 }}
          />
        </div>
        <div className="admin-table-scroll">
          <table className="table table-hover" style={{ tableLayout: 'auto', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>_id</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>ProductId</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>UserId</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>Rating</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>Comment</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>Trạng thái</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>Ngày</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.map(review => (
                <tr key={review._id}>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all' }} title={review._id}><code>{review._id}</code></td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all' }} title={typeof review.productId === 'object' ? review.productId?._id : review.productId}><code>{typeof review.productId === 'object' ? review.productId?._id : review.productId}</code></td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all' }} title={typeof review.userId === 'object' ? review.userId?._id : review.userId}><code>{typeof review.userId === 'object' ? review.userId?._id : review.userId}</code></td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: 110, maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{'⭐'.repeat(review.rating)}</td>
                  <td style={{ maxWidth: 340, minWidth: 120, whiteSpace: 'pre-line', overflowWrap: 'break-word', wordBreak: 'break-word', textAlign: review.comment && review.comment.length < 30 ? 'center' : 'left', padding: '8px 12px', verticalAlign: 'middle' }} title={review.comment}>{review.comment}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>
                    <select 
                      data-status={review.status} 
                      className="form-select form-select-sm review-status"
                      style={{
                        backgroundColor: review.status === 'inactive' ? '#fee' : '#efe',
                        color: review.status === 'inactive' ? '#c00' : '#080',
                        fontWeight: '600'
                      }}
                      value={review.status || 'active'} 
                      onChange={async (e) => {
                        setLoading(true);
                        try {
                          await updateReviewAdmin(effectiveToken, review._id, { status: e.target.value });
                          await loadReviews();
                        } catch (err) {
                          alert('Lỗi khi đổi trạng thái');
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      <option value="active" style={{ backgroundColor: '#efe', color: '#080', fontWeight: '600' }}>Active</option>
                      <option value="inactive" style={{ backgroundColor: '#fee', color: '#c00', fontWeight: '600' }}>Inactive</option>
                    </select>
                  </td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{new Date(review.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }} >
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteReview(review._id)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn xóa đánh giá này không? Hành động này không thể hoàn tác."
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