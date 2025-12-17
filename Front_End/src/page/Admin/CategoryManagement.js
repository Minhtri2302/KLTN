import React, { useState, useEffect } from 'react';

import { listCategories, createCategory, updateCategory, deleteCategory } from '../../service/category.service';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Loading from '../../components/Loading';

export default function CategoryManagement({ token }) {
  const effectiveToken = token || sessionStorage.getItem('token');

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });

  useEffect(() => {
    loadCategories();
  }, []);

  // Logic CRUD 
  const loadCategories = async () => {
    try {
      setLoading(true);
  const categoriesList = await listCategories(effectiveToken);
      setCategories(categoriesList);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const openCategoryForm = (cat = null) => {
    setCurrentCategory(cat);
    // reset preview when opening
    setPreviewUrl(cat?.image || null);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const name = (formData.get('name') || '').toString().trim();
    if (!name) { 
      setToast({ message: 'Tên danh mục bắt buộc', type: 'warning' });
      return; 
    }

    // attach image file if selected
    const fileInput = form.querySelector('input[name="image"]');
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      formData.set('image', fileInput.files[0]);
    }

    setLoading(true);
    try {
      if (currentCategory && currentCategory._id) {
        await updateCategory(token, currentCategory._id, formData);
        setToast({ message: 'Cập nhật danh mục thành công', type: 'success' });
      } else {
        await createCategory(token, formData);
        setToast({ message: 'Tạo danh mục thành công', type: 'success' });
      }
      setShowCategoryModal(false);
      setCurrentCategory(null);
      setPreviewUrl(null);
      await loadCategories();
    } catch (err) {
      console.error('Error saving category', err);
      setToast({ message: 'Lỗi khi lưu danh mục', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (catId) => {
    setCategoryToDelete(catId);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      await deleteCategory(token, categoryToDelete);
      await loadCategories();
      setToast({ message: 'Xóa danh mục thành công', type: 'success' });
    } catch (err) {
      console.error('Delete category failed', err);
      setToast({ message: 'Lỗi khi xóa danh mục', type: 'error' });
    } finally {
      setLoading(false);
      setCategoryToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirmModal(false);
    setCategoryToDelete(null);
  };
  // Filter logic
  const filteredCategories = categories.filter(c =>
    !searchQuery ||
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c._id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <>
      <div style={{ position: 'relative' }}>
        {loading && <Loading />}
       <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Quản lý danh mục</h3>
          <div>
            <input className="form-control form-control-sm" placeholder="Tìm danh mục..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <button className="btn-add-purple" onClick={() => openCategoryForm(null)}>
              + Thêm danh mục
            </button>
          </div>
        </div>
        <div className="table-responsive product-table-scroll">
          <table className="table table-hover" style={{ tableLayout: 'auto', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Mã danh mục</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Ảnh</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Tên</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map(cat => (
                <tr key={cat._id}>
                  <td style={{ minWidth: 260, verticalAlign: 'middle', textAlign: 'center' }}> <code style={{ wordBreak: 'break-all' }}>{cat._id}</code> </td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }} />
                    ) : (
                      <div style={{ width: 120, height: 80, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', borderRadius: 6 }}>No image</div>
                    )}
                  </td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center', wordBreak: 'break-word' }}>{cat.name}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <button className="btn btn-sm btn-warning me-1" onClick={() => openCategoryForm(cat)}>Sửa</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteCategory(cat._id)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL của Category (Tái tạo từ logic) */}
      {showCategoryModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleSaveCategory}>
                <div className="modal-header">
                  <h5 className="modal-title">{currentCategory ? 'Sửa danh mục' : 'Thêm danh mục'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowCategoryModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Tên danh mục</label>
                    <input name="name" className="form-control" defaultValue={currentCategory?.name} required />
                  </div>
                  <div className="form-group mt-2">
                    <label>Ảnh danh mục (tùy chọn)</label>
                    <input name="image" type="file" accept="image/*" className="form-control" onChange={(e) => {
                      const f = e.target.files && e.target.files[0];
                      if (f) {
                        const url = URL.createObjectURL(f);
                        setPreviewUrl(url);
                      } else {
                        setPreviewUrl(currentCategory?.image || null);
                      }
                    }} />
                    <div style={{ marginTop: 8 }}>
                      {previewUrl && <img src={previewUrl} alt="preview" style={{ maxWidth: 200, maxHeight: 120 }} />}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>Hủy</button>
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
        message="Bạn có chắc chắn muốn xóa danh mục này không? Hành động này không thể hoàn tác."
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