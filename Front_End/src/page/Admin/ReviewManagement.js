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
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentReview, setCurrentReview] = useState(null); // Dùng cho modal
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

  const openReviewModal = (r) => {
    setCurrentReview(r);
    setShowReviewModal(true);
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

  const saveReview = async (review) => {
    if (!review || !review._id) return;
    setLoading(true);
    try {
      await updateReviewAdmin(effectiveToken, review._id, { rating: review.rating, comment: review.comment, status: review.status });
      await loadReviews();
      setShowReviewModal(false);
      setCurrentReview(null);
      setToast({ message: 'Cập nhật đánh giá thành công', type: 'success' });
    } catch (err) {
      console.error('Update review failed', err);
      setToast({ message: 'Lỗi khi cập nhật đánh giá', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredReviews = (reviews || []).filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (r.productId && r.productId.toLowerCase().includes(q)) ||
      (r.userId && r.userId.toLowerCase().includes(q)) ||
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
                  <td style={{ verticalAlign: 'middle', textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all' }} title={review.productId}><code>{review.productId}</code></td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all' }} title={review.userId}><code>{review.userId}</code></td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: 110, maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{'⭐'.repeat(review.rating)}</td>
                  <td style={{ maxWidth: 340, minWidth: 120, whiteSpace: 'pre-line', overflowWrap: 'break-word', wordBreak: 'break-word', textAlign: review.comment && review.comment.length < 30 ? 'center' : 'left', padding: '8px 12px', verticalAlign: 'middle' }} title={review.comment}>{review.comment}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>
                    <select
                      className="form-select form-select-sm status-select"
                      style={{
                        minWidth: 100,
                        borderRadius: 20,
                        padding: '2px 16px',
                        border: review.status === 'inactive' ? '2px solid #dc3545' : review.status === 'down' ? '2px solid #ffc107' : '2px solid #198754',
                        color: review.status === 'inactive' ? '#dc3545' : review.status === 'down' ? '#ffc107' : '#198754',
                        fontWeight: 600,
                        background: review.status === 'inactive' ? '#fff6f6' : review.status === 'down' ? '#fffbe6' : '#f6fff6',
                        transition: 'border 0.2s, background 0.2s, color 0.2s',
                        outline: 'none',
                        cursor: 'pointer',
                        margin: '0 auto',
                        display: 'block',
                        textAlign: 'center',
                        textAlignLast: 'center',
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
                      onFocus={e => e.target.style.boxShadow = '0 0 0 2px #b5e0b5'}
                      onBlur={e => e.target.style.boxShadow = 'none'}
                    >
                      <option value="active" style={{ color: '#198754', background: '#f6fff6', textAlign: 'center' }}>Active</option>
                      <option value="inactive" style={{ color: '#dc3545', background: '#fff6f6', textAlign: 'center' }}>Inactive</option>
                    </select>
                  </td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{new Date(review.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }} >
                    <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <button className="btn btn-sm btn-warning me-1" onClick={() => openReviewModal(review)}>Sửa</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteReview(review._id)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL Review (Copy từ file gốc - file của bạn CÓ modal này) */}
      {showReviewModal && currentReview && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Sửa đánh giá</h5>
                <button type="button" className="btn-close" onClick={() => { setShowReviewModal(false); setCurrentReview(null); }}></button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>ProductId</label>
                  <input className="form-control" value={currentReview.productId || ''} readOnly />
                </div>
                <div className="form-group">
                  <label>UserId</label>
                  <input className="form-control" value={currentReview.userId || 'Khách'} readOnly />
                </div>
                <div className="form-group">
                  <label>Rating</label>
                  <select className="form-control" value={currentReview.rating} onChange={e => setCurrentReview(prev => ({ ...prev, rating: Number(e.target.value) }))}>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Comment</label>
                  <textarea className="form-control" rows={4} value={currentReview.comment || ''} onChange={e => setCurrentReview(prev => ({ ...prev, comment: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Trạng thái</label>
                  <select className="form-control" value={currentReview.status || 'active'} onChange={e => setCurrentReview(prev => ({ ...prev, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => { setShowReviewModal(false); setCurrentReview(null); }}>Hủy</button>
                <button className="btn btn-primary" onClick={() => saveReview(currentReview)}>Lưu</button>
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