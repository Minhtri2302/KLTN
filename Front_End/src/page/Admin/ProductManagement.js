// Tên file: admin/ProductManagement.js

import React, { useState, useEffect } from 'react';
// Import service CẦN THIẾT
import { listProducts, createProduct, updateProduct, deleteProduct } from '../../service/product.service';
import { listCategories } from '../../service/category.service';
import { uploadImage as uploadProfileImage } from '../../service/profile.service'; // Dùng chung hàm upload ảnh
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Loading from '../../components/Loading';

export default function ProductManagement({ token }) {
  // Allow a fallback to localStorage token when the prop was not provided
  // (some routes or dev flows may mount this component without the prop).
  const effectiveToken = token || sessionStorage.getItem('token');
  // State của riêng Products
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });

  // Load data khi component được mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load cả product và category (cho dropdown)
      const [productsList, categoriesList] = await Promise.all([
        listProducts(effectiveToken),
        listCategories(effectiveToken)
      ]);
      setProducts(productsList);
      setCategories(categoriesList);
    } catch (error) {
      console.error('Error loading product data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Hàm load products (dùng khi chỉ cần refresh product)
  const loadProducts = async () => {
    try {
      setLoading(true);
  const productsList = await listProducts(effectiveToken);
      setProducts(productsList);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Preview ảnh (copy từ file admin.js gốc)
  useEffect(() => {
    let currentUrl = null;
    if (showProductModal) {
      const input = document.querySelector('input[name="image"]');
      const previewContainer = document.getElementById('selected-image-preview');
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
  }, [showProductModal]);


  //  CRUD (copy từ file admin.js gốc)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target;
    const formData = new FormData(form);

    let imageUrl = currentProduct?.image || '';
    const fileInput = form.querySelector('input[name="image"]');
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      try {
        const uploadData = await uploadProfileImage(token, file);
        imageUrl = uploadData?.url || uploadData?.secure_url || imageUrl;
      } catch (err) {
        console.error('Error uploading image:', err);
        alert('Lỗi khi upload ảnh.');
        setLoading(false);
        return;
      }
    }


    const productData = {
      name: formData.get('name'),
      description: formData.get('description'),
      price: parseFloat(formData.get('price')),
      categoryId: formData.get('categoryId'),
      stock: formData.get('stock') !== '' ? parseInt(formData.get('stock')) : 0,
      specifications: formData.get('specifications') || '',
    };

    if (imageUrl && typeof imageUrl === 'string') {
      productData.image = imageUrl;
    }
    if (!currentProduct && (!productData.image || productData.image === '')) {
      alert('Vui lòng chọn ảnh cho sản phẩm.');
      setLoading(false);
      return;
    }

    try {
      if (currentProduct) {
        await updateProduct(token, currentProduct._id, productData);
      } else {
        await createProduct(token, productData);
      }
      setShowProductModal(false);
      setCurrentProduct(null);
      await loadProducts(); // Chỉ load lại product
      setToast({ 
        message: currentProduct ? 'Cập nhật sản phẩm thành công!' : 'Thêm sản phẩm thành công!', 
        type: 'success' 
      });
    } catch (error) {
      console.error('Error saving product:', error);
      setToast({ message: 'Có lỗi xảy ra!', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    setItemToDelete(productId);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    setShowConfirmModal(false);
    try {
      setLoading(true);
      await deleteProduct(token, itemToDelete);
      await loadProducts(); // Chỉ load lại product
      setToast({ message: 'Xóa sản phẩm thành công!', type: 'success' });
    } catch (error) {
      console.error('Error deleting product:', error);
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

  const openProductModal = (product = null) => {
    setCurrentProduct(product);
    setShowProductModal(true);
  }

  // Filter logic
  const filteredProducts = products.filter(p =>
    (!selectedCategoryFilter || p.categoryId === selectedCategoryFilter) &&
    (!searchQuery ||
      (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p._id || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <>
      <div style={{ position: 'relative' }}>
        {loading && <Loading />}
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Quản lý sản phẩm</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="form-control form-control-sm" placeholder="Tìm sản phẩm..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: 'auto', minWidth: 160 }} />
            <select className="form-select form-select-sm" value={selectedCategoryFilter} onChange={e => setSelectedCategoryFilter(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
              <option value="">-- Tất cả danh mục --</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>

            <button className="btn-add-purple" onClick={() => openProductModal(null)}>
              + Thêm sản phẩm
            </button>
          </div>
        </div>
        <div className="table-responsive product-table-scroll">
          <table className="table table-hover" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: 120 }}>Mã SP</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: 110 }}>Hình ảnh</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: 120 }}>Tên sản phẩm</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: 160 }}>Mô tả</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: 120 }}>Giá</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: 70 }}>Tồn kho</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: 160 }}>Thông số</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: 110 }}>Danh mục</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: 120 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product._id} style={{ height: 80, verticalAlign: 'middle' }}>
                  <td style={{ minWidth: 120, textAlign: 'center', verticalAlign: 'middle', wordBreak: 'break-all', fontSize: 13 }}>
                    <code>{product._id}</code>
                  </td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                    <div style={{ width: 80, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                      <img src={product.image} alt={product.name} className="product-image-preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center', fontWeight: 500 }}>{product.name}</td>
                  <td style={{ maxWidth: 180, verticalAlign: 'middle', textAlign: 'left', fontSize: 13, whiteSpace: 'pre-line', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {product.description || ''}
                  </td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'right', fontWeight: 600 }}>{product.price?.toLocaleString('vi-VN')}đ</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{typeof product.stock === 'number' ? product.stock : 0}</td>
                  <td style={{ maxWidth: 180, verticalAlign: 'middle', textAlign: 'left', fontSize: 13, whiteSpace: 'pre-line', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.specifications || ''}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{categories.find(c => c._id === product.categoryId)?.name || 'N/A'}</td>
                  <td style={{ minWidth: 120, verticalAlign: 'middle', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                      <button className="btn btn-sm btn-warning" onClick={() => openProductModal(product)}> Sửa </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteProduct(product._id)}> Xóa </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL của Product (Tái tạo từ logic) */}
      {showProductModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleSaveProduct}>
                <div className="modal-header">
                  <h5 className="modal-title">{currentProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowProductModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="form-group mb-2">
                    <label>Tên sản phẩm</label>
                    <input name="name" className="form-control" defaultValue={currentProduct?.name} required />
                  </div>
                  <div className="form-group mb-2">
                    <label>Mô tả</label>
                    <textarea name="description" className="form-control" rows="3" defaultValue={currentProduct?.description}></textarea>
                  </div>
                  <div className="row">
                    <div className="col-md-6 form-group mb-2">
                      <label>Giá</label>
                      <input name="price" type="number" className="form-control" defaultValue={currentProduct?.price} required />
                    </div>
                    <div className="col-md-6 form-group mb-2">
                      <label>Danh mục</label>
                      <select name="categoryId" className="form-select" defaultValue={currentProduct?.categoryId} required>
                        <option value="">-- Chọn danh mục --</option>
                        {categories.map(cat => (
                          <option key={cat._id} value={cat._id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group mb-2">
                    <label>Tồn kho</label>
                    <input name="stock" type="number" className="form-control" min="0" defaultValue={currentProduct?.stock ?? 0} required />
                  </div>
                  <div className="form-group mb-2">
                    <label>Thông số kỹ thuật</label>
                    <textarea name="specifications" className="form-control" rows="3" defaultValue={currentProduct?.specifications}></textarea>
                  </div>
                  <div className="form-group mb-2">
                    <label>Ảnh</label>
                    <input name="image" type="file" className="form-control" accept="image/*" />
                    <div id="selected-image-preview" className="mt-2">
                      {currentProduct?.image && !document.querySelector('input[name="image"]')?.files?.[0] && (
                        <img src={currentProduct.image} alt="Preview" style={{ maxWidth: 200, maxHeight: 120 }} />
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowProductModal(false)}>Hủy</button>
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
        message="Bạn có chắc chắn muốn xóa sản phẩm này không? Hành động này không thể hoàn tác."
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