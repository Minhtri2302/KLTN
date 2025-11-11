import React, { useState, useEffect, useMemo } from 'react';
// Import service CẦN THIẾT
import { listBanners, createBanner, updateBanner, deleteBanner } from '../../service/banner.service';
import { uploadImage as uploadProfileImage } from '../../service/profile.service'; // Dùng chung hàm upload
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Loading from '../../components/Loading';
import '../../CSS/admin.css';

export default function BannerManagement({ token }) {
  // fallback to localStorage when token prop isn't provided
  const effectiveToken = token || sessionStorage.getItem('token');
  const [loading, setLoading] = useState(false);
  const [banners, setBanners] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });

  useEffect(() => {
    loadBanners();
  }, []);

  // Preview ảnh 
  useEffect(() => {
    let currentUrl = null;
    if (showBannerModal) {
      const input = document.querySelector('input[name="image"]');
      const previewContainer = document.getElementById('selected-banner-image-preview');
      const handler = (ev) => {
        if (!previewContainer) return;
        previewContainer.innerHTML = '';
        const file = ev.target.files && ev.target.files[0];
        if (file) {
          if (currentUrl) URL.revokeObjectURL(currentUrl);
          currentUrl = URL.createObjectURL(file);
          const img = document.createElement('img');
          img.src = currentUrl;
          img.style.maxWidth = '200px';
          img.style.maxHeight = '120px';
          previewContainer.appendChild(img);
        }
      };
      if (input) input.addEventListener('change', handler);
      return () => {
        if (input) input.removeEventListener('change', handler);
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        if (previewContainer) previewContainer.innerHTML = '';
      };
    }
  }, [showBannerModal]);

  // Logic CRUD 
  const loadBanners = async () => {
    setLoading(true);
    try {
  const bannersList = await listBanners(effectiveToken);
      setBanners(bannersList);
    } catch (error) {
      console.error('Error loading banners:', error);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBanner = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target;
    const formData = new FormData(form);

    let imageUrl = currentBanner?.image || formData.get('image') || '';
    const fileInput = form.querySelector('input[name="image"]');
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      try {
  const uploadData = await uploadProfileImage(effectiveToken, file);
        imageUrl = uploadData?.url || uploadData?.secure_url || imageUrl;
      } catch (err) {
        console.error('Error uploading banner image:', err);
        alert('Lỗi khi upload ảnh banner.');
        setLoading(false);
        return;
      }
    }

    const bannerData = {
      name: (formData.get('name') || '').toString(),
      image: imageUrl,
      active: formData.get('active') === 'true',
      position: parseInt(formData.get('position') || '0', 10)
    };

    console.log('Banner data to save:', bannerData); // Debug log

    if (!bannerData.image) {
      setToast({ message: 'Cần có ảnh cho banner', type: 'warning' });
      setLoading(false);
      return;
    }

    try {
      if (currentBanner) {
        console.log('Updating banner:', currentBanner._id, bannerData); // Debug log
        await updateBanner(effectiveToken, currentBanner._id, bannerData);
      } else {
        console.log('Creating banner:', bannerData); // Debug log
        await createBanner(effectiveToken, bannerData);
      }
      setShowBannerModal(false);
      setCurrentBanner(null);
      await loadBanners();
      setToast({ 
        message: currentBanner ? 'Cập nhật banner thành công!' : 'Thêm banner thành công!', 
        type: 'success' 
      });
    } catch (error) {
      console.error('Error saving banner:', error);
      setToast({ message: 'Có lỗi xảy ra!', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    setItemToDelete(bannerId);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      await deleteBanner(effectiveToken, itemToDelete);
      await loadBanners();
      setToast({ message: 'Xóa banner thành công!', type: 'success' });
    } catch (error) {
      console.error('Error deleting banner:', error);
      setToast({ message: 'Có lỗi xảy ra!', type: 'error' });
    } finally {
      setLoading(false);
      setItemToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirmModal(false);
    setItemToDelete(null);
  };
  
  const openBannerModal = (banner = null) => {
    setCurrentBanner(banner);
    setShowBannerModal(true);
  }

  const displayedBanners = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return banners || [];
    return (banners || []).filter(b => {
      try {
        return (b.name || '').toString().toLowerCase().includes(q) || (b.image || '').toString().toLowerCase().includes(q);
      } catch (e) { return false; }
    });
  }, [banners, searchQuery]);

  return (
    <>
      <div style={{ position: 'relative' }}>
        {loading && <Loading />}

        <div className="section-header">
          <h3>Quản lý Banners</h3>
           <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}></div>
            <input className="form-control form-control-sm" placeholder="Tìm sản phẩm..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: 'auto', minWidth: 160 }} />
          <div>
            <button type="button" className="btn-add-purple" onClick={() => openBannerModal(null)} aria-label="Thêm Banner">
              <span> + Thêm Banner</span>
            </button>
          </div>
        </div>

        <div className="admin-table-scroll">
          <table className="table table-hover" style={{ tableLayout: 'auto', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Vị trí</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Tên</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Hình ảnh</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {displayedBanners.map(b => (
                <tr key={b._id}>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{b.position || 0}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center', wordBreak: 'break-word' }}>{b.name}</td>
                  <td style={{ verticalAlign: 'middle', width: 140, textAlign: 'center' }}>
                    <div style={{ width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                      <img src={b.image} alt={b.name} className="banner-image-preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'flex' }} />
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{b.active ? <span className="badge bg-success">Active</span> : <span className="badge bg-secondary">Inactive</span>}</td>
                  <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <button className="btn btn-sm btn-warning " onClick={() => openBannerModal(b)}>Sửa</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteBanner(b._id)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL Banner (Tái tạo) */}
      {showBannerModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleSaveBanner}>
                <div className="modal-header">
                  <h5 className="modal-title">{currentBanner ? 'Sửa Banner' : 'Tạo Banner'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowBannerModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="form-group mb-2">
                    <label>Vị trí (thứ tự hiển thị)</label>
                    <input name="position" type="number" className="form-control" defaultValue={currentBanner?.position || 0} min="0" />
                    <small className="text-muted">Số nhỏ hơn sẽ hiển thị trước (0, 1, 2, 3...)</small>
                  </div>
                  <div className="form-group mb-2">
                    <label>Tên (dễ nhận biết)</label>
                    <input name="name" className="form-control" defaultValue={currentBanner?.name} required />
                  </div>
                  <div className="form-group mb-2">
                    <label>Ảnh Banner</label>
                    <input name="image" type="file" className="form-control" accept="image/*" />
                    <div id="selected-banner-image-preview" className="mt-2">
                      {currentBanner?.image && <img src={currentBanner.image} alt="Preview" style={{ maxWidth: 200, maxHeight: 120 }} />}
                    </div>
                  </div>
                  <div className="form-group mb-2">
                    <label>Trạng thái</label>
                    <select name="active" className="form-select" defaultValue={currentBanner?.active === true ? 'true' : 'false'}>
                      <option value="true">Active (Hiển thị)</option>
                      <option value="false">Inactive (Ẩn)</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowBannerModal(false)}>Hủy</button>
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
        message="Bạn có chắc chắn muốn xóa banner này không? Hành động này không thể hoàn tác."
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