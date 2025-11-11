import React, { useState, useEffect } from 'react';
import { listNews, createNews, updateNews, deleteNews } from '../../service/news.service';
// reuse existing upload helper (sends multipart/form-data to /uploads/image)
import { uploadImage } from '../../service/profile.service';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Loading from '../../components/Loading';

export default function NewsManagement({ token }) {
  // fallback token when prop missing
  const effectiveToken = token || sessionStorage.getItem('token');
  const [loading, setLoading] = useState(false);
  const [newsList, setNewsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [current, setCurrent] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
  const items = await listNews(effectiveToken);
      setNewsList(items || []);
    } catch (err) { console.error('load news failed', err); setNewsList([]); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setCurrent({ title: '', author: '', tags: '', image: '', content: '' }); setShowModal(true); };
  const openEdit = (item) => { setCurrent({ ...item, tags: (item.tags || []).join(', ') }); setShowModal(true); };

  const handleFileChange = async (file) => {
    if (!file) return;
  // prefer effectiveToken but fall back to localStorage check for uploads
  const uploadToken = effectiveToken || sessionStorage.getItem('token');
  if (!uploadToken) { alert('Không có token. Vui lòng đăng nhập.'); return; }
    setUploadingImage(true);
    try {
  const data = await uploadImage(uploadToken, file);
      // backend returns { url } or { secure_url }
      const url = data?.url || data?.secure_url || data?.secureUrl || null;
      if (url) {
        setCurrent(prev => ({ ...prev, image: url }));
      } else {
        setToast({ message: 'Upload thất bại: không nhận được URL', type: 'error' });
      }
    } catch (err) {
      console.error('upload image failed', err);
      setToast({ message: err?.message || 'Lỗi khi upload ảnh', type: 'error' });
    } finally {
      setUploadingImage(false);
    }
  };

  const save = async (item) => {
    if (!item || !item.title || !item.content) { 
      setToast({ message: 'Title và nội dung là bắt buộc', type: 'warning' }); 
      return; 
    }
    setLoading(true);
    try {
      const body = { title: item.title, content: item.content, image: item.image, author: item.author, tags: (item.tags || item.tags === '') ? (typeof item.tags === 'string' ? item.tags.split(',').map(t=>t.trim()).filter(Boolean) : item.tags) : [] };
      if (item._id) {
        await updateNews(effectiveToken, item._id, body);
        setToast({ message: 'Cập nhật tin tức thành công', type: 'success' });
      } else {
        await createNews(effectiveToken, body);
        setToast({ message: 'Tạo tin tức mới thành công', type: 'success' });
      }
      setShowModal(false);
      setCurrent(null);
      await load();
    } catch (err) { console.error('save news failed', err); setToast({ message: err.message || 'Lỗi khi lưu', type: 'error' }); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    setItemToDelete(id);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      await deleteNews(effectiveToken, itemToDelete);
      setToast({ message: 'Xóa thành công', type: 'success' });
      await load();
    } catch (err) { console.error('delete news failed', err); setToast({ message: 'Lỗi khi xóa', type: 'error' }); }
    finally { 
      setLoading(false);
      setItemToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirmModal(false);
    setItemToDelete(null);
  };

  const filtered = (newsList || []).filter(n => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (n.title && n.title.toLowerCase().includes(q)) || (n.author && n.author.toLowerCase().includes(q)) || (n.tags && n.tags.join(',').toLowerCase().includes(q));
  });

  return (
    <>
      <div style={{ position: 'relative' }}>
        {loading && <Loading />}

        <div className="section-header">
          <h3>Quản lý tin tức</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="form-control form-control-sm" placeholder="Tìm theo tiêu đề, tác giả, tag..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} style={{ width: 'auto', minWidth: 200 }} />
            <button className="btn-add-purple" onClick={openCreate}>
              + Tạo mới
            </button>
          </div>
        </div>

        <div className="admin-table-scroll">
          <table className="table table-hover" style={{ tableLayout: 'auto', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: 120 }}>_id</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: 200 }}>Tiêu đề</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: 100 }}>Tác giả</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: 110 }}>Ảnh</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: 120 }}>Tags</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: 110 }}>Ngày</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: 120 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(n => (
                <tr key={n._id}>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center', wordBreak: 'break-all', fontSize: 13 }}><code>{n._id}</code></td>
                  <td style={{ maxWidth: 300, verticalAlign: 'middle', textAlign: 'left', whiteSpace: 'normal', wordBreak: 'break-word' }}>{n.title}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{n.author || '-'}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                    <div style={{ width: 80, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                      <img src={n.image || ''} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{(n.tags || []).join(', ')}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{n.publishedAt ? new Date(n.publishedAt).toLocaleDateString('vi-VN') : ''}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                      <button className="btn btn-sm btn-warning" onClick={()=>openEdit(n)}>Sửa</button>
                      <button className="btn btn-sm btn-danger" onClick={()=>handleDelete(n._id)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{current && current._id ? 'Sửa tin tức' : 'Tạo tin tức'}</h5>
                <button type="button" className="btn-close" onClick={()=>{ setShowModal(false); setCurrent(null); }}></button>
              </div>
              <div className="modal-body">
                <div className="form-group mb-2">
                  <label>Tiêu đề</label>
                  <input className="form-control" value={current.title} onChange={e=>setCurrent(prev=>({ ...prev, title: e.target.value }))} />
                </div>
                <div className="form-group mb-2">
                  <label>Tác giả</label>
                  <input className="form-control" value={current.author || ''} onChange={e=>setCurrent(prev=>({ ...prev, author: e.target.value }))} />
                </div>
                <div className="form-group mb-2">
                  <label>Ảnh</label>
                  {current.image ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <img src={current.image} alt="preview" style={{ maxWidth: 160, maxHeight: 90, objectFit: 'cover', border: '1px solid #ddd' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input type="file" accept="image/*" onChange={e=>handleFileChange(e.target.files && e.target.files[0])} />
                        <div>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={()=>setCurrent(prev=>({ ...prev, image: '' }))}>Xóa ảnh</button>
                          {uploadingImage && <span style={{ marginLeft: 8 }}>Đang tải...</span>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="file" accept="image/*" onChange={e=>handleFileChange(e.target.files && e.target.files[0])} />
                      {uploadingImage && <span>Đang tải...</span>}
                    </div>
                  )}
                </div>
                <div className="form-group mb-2">
                  <label>Tags (phân cách bằng dấu phẩy)</label>
                  <input className="form-control" value={current.tags || ''} onChange={e=>setCurrent(prev=>({ ...prev, tags: e.target.value }))} />
                </div>
                <div className="form-group mb-2">
                  <label>Nội dung</label>
                  <textarea className="form-control" rows={8} value={current.content || ''} onChange={e=>setCurrent(prev=>({ ...prev, content: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={()=>{ setShowModal(false); setCurrent(null); }}>Hủy</button>
                <button className="btn btn-primary" onClick={()=>save(current)}>Lưu</button>
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
        message="Bạn có chắc chắn muốn xóa tin tức này không? Hành động này không thể hoàn tác."
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