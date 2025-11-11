import React, { useState, useEffect } from 'react';
// Import service CẦN THIẾT
import { listOrders, createOrder, updateOrder, deleteOrder } from '../../service/order.service';
import { listProducts } from '../../service/product.service';
import { listAccounts } from '../../service/account.service';
import { listProfiles, getProfileByAccountId } from '../../service/profile.service';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Loading from '../../components/Loading';

export default function OrderManagement({ token }) {
  // fallback token when prop not passed
  const effectiveToken = token || sessionStorage.getItem('token');
  // State của riêng Orders
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState([]);

  // State cho modal xem chi tiết
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);

  // State cho modal form (tạo/sửa)
  const [showOrderFormModal, setShowOrderFormModal] = useState(false);
  const [currentOrderForm, setCurrentOrderForm] = useState(null);

  // State cho data lookup (dùng trong form)
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [userProfiles, setUserProfiles] = useState([]);
  // UI helpers for adding items via select + qty
  const [newItemProductId, setNewItemProductId] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });

  // Load data khi component được mount
  useEffect(() => {
    loadData();
  }, []);

  // Helper: create a default empty order form object
  const createEmptyOrderForm = () => ({
    accountId: '',
    items: [],
    shipping: { fullName: '', phone: '', address: '', mail: '' },
    totalAmount: 0,
    status: 'Chờ xử lý'
  });

  // Helper: parse a simple list format (id,id or id:qty per line) into item objects
  const tryParseSimpleList = (text) => {
    const parts = (text || '').split(/[,\n]+/).map(p => p.trim()).filter(Boolean);
    return parts.map(p => {
      // Match formats like "id:3", "id x 3", "id|3", "id*3"
      const m = p.match(/^(.*?)[\s:\|xX\*]+(\d+)$/);
      if (m) {
        return { productId: m[1].trim(), quantity: Number(m[2]) };
      }
      return p;
    });
  };

  // Helper: build shipping object from preloaded profiles/accounts when accountId changes
  const buildShippingForAccount = (accountId, prevShipping) => {
    const accountIdStr = (accountId || '').toString();
    const profile = accountIdStr ? userProfiles.find(p => String(p.accountId) === String(accountIdStr)) : null;
    const account = accountIdStr ? users.find(u => String(u._id) === String(accountIdStr)) : null;
    return {
      fullName: (profile && (profile.name || profile.fullName)) || (account && account.username) || prevShipping?.fullName || '',
      phone: (profile && profile.phone) || prevShipping?.phone || '',
      address: prevShipping?.address || '',
      mail: (profile && profile.email) || (account && account.email) || prevShipping?.mail || prevShipping?.email || '',
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      // Load tất cả data cần thiết cho tab này (orders + lookups cho form)
      const [ordersList, productsList, usersList, profilesList] = await Promise.all([
        listOrders(effectiveToken),
        listProducts(effectiveToken),
        listAccounts(effectiveToken),
        listProfiles(effectiveToken)
      ]);
      setOrders(ordersList);
      setProducts(productsList);
      setUsers(usersList);
      setUserProfiles(profilesList);
    } catch (error) {
      console.error('Error loading order data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle accountId changes in the form and auto-fill shipping info
  function handleAccountIdChange(value) {
    setCurrentOrderForm(prev => {
      const base = prev || createEmptyOrderForm();
      const accountId = (value || '').toString();

      // If we don't have a local profile, try to fetch one remotely and merge it in
      const localProfile = accountId ? userProfiles.find(p => String(p.accountId) === String(accountId)) : null;
      if (!localProfile && accountId) {
        getProfileByAccountId(effectiveToken, accountId).then(remoteProfile => {
          if (!remoteProfile) return;
          setCurrentOrderForm(prev2 => ({
            ...(prev2 || base),
            accountId,
            shipping: {
              ...(prev2?.shipping || {}),
              fullName: remoteProfile.name || remoteProfile.fullName || (prev2?.shipping?.fullName || ''),
              phone: remoteProfile.phone || (prev2?.shipping?.phone || ''),
              address: prev2?.shipping?.address || '',
              mail: remoteProfile.email || (prev2?.shipping?.mail || ''),
            }
          }));
        }).catch(() => { });
      }

      return { ...base, accountId, shipping: buildShippingForAccount(accountId, base.shipping) };
    });
  }

  // Hàm chỉ load lại order (dùng sau khi update)
  const loadOrders = async () => {
    try {
      setLoading(true);
      const ordersList = await listOrders(effectiveToken);
      setOrders(ordersList);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };


  // ---  CRUD của Order  ---

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      setLoading(true);
      await updateOrder(effectiveToken, orderId, { status: newStatus });
      await loadOrders();
      setToast({ message: 'Cập nhật trạng thái đơn hàng thành công!', type: 'success' });
    } catch (error) {
      console.error('Error updating order:', error);
      setToast({ message: 'Có lỗi xảy ra!', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    setItemToDelete(orderId);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    setShowConfirmModal(false);
    try {
      setLoading(true);
      await deleteOrder(effectiveToken, itemToDelete);
      await loadOrders();
      setToast({ message: 'Xóa đơn hàng thành công!', type: 'success' });
    } catch (error) {
      console.error('Error deleting order:', error);
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

  const openOrderForm = (order = null) => {
    if (order) {
      const ship = order.shipping || {};
      // Normalize items: ensure productId is string and keep other data
      const normalizedItems = (order.items || []).map(item => {
        let productId;
        if (typeof item.productId === 'object' && item.productId !== null) {
          // productId is populated, extract the ID
          productId = item.productId._id || item.productId.id;
        } else {
          productId = item.productId || item._id;
        }
        
        return {
          productId: String(productId),
          name: item.name || (typeof item.productId === 'object' ? item.productId.name : ''),
          image: item.image || (typeof item.productId === 'object' ? item.productId.image : ''),
          price: item.price,
          quantity: item.quantity
        };
      });
      
      setCurrentOrderForm({
        _id: order._id,
        accountId: order.accountId || '',
        items: normalizedItems,
        shipping: {
          fullName: ship.name || ship.fullName || '',
          phone: ship.phone || '',
          address: ship.address || '',
          mail: ship.email || ship.mail || ''
        },
        totalAmount: order.total || order.totalAmount || 0,
        status: order.status || 'Chờ xử lý'
      });
    } else {
      setCurrentOrderForm(createEmptyOrderForm());
    }
    setShowOrderFormModal(true);
  };

  const resolveProductIdentifier = (identifier) => {
    const id = (identifier || '').toString().trim();
    if (!id) return null;
    // If token contains a pipe (we may fill datalist with id|name), prefer id before pipe
    if (id.includes('|')) {
      return id.split('|')[0];
    }
    // exact match id
    const byId = products.find(p => String(p._id) === id);
    if (byId) return byId._id;
    // exact name match (case-insensitive)
    const byNameExact = products.find(p => (p.name || '').toLowerCase() === id.toLowerCase());
    if (byNameExact) return byNameExact._id;
    // substring match on name
    const byNameContains = products.find(p => (p.name || '').toLowerCase().includes(id.toLowerCase()));
    if (byNameContains) return byNameContains._id;
    return null;
  };

  const addItemToForm = (productIdentifier, quantity = 1) => {
    const resolvedId = resolveProductIdentifier(productIdentifier);
    if (!resolvedId) {
      // if identifier looks like an id, still proceed using it; otherwise alert
      if ((productIdentifier || '').trim()) {
        // allow raw id even if not found in product list
        // treat as id string
      } else return;
    }
    const finalProductId = resolvedId || (productIdentifier || '').toString().trim();
    
    // Lookup product info to auto-fill name, image, price
    const product = products.find(p => String(p._id) === String(finalProductId));
    
    setCurrentOrderForm(prev => {
      const base = prev || { items: [] };
      const items = Array.isArray(base.items) ? [...base.items] : [];
      const idx = items.findIndex(i => String((i.productId || i).toString()) === String(finalProductId));
      if (idx >= 0) {
        const it = items[idx];
        const qty = (it.quantity || 1) + Number(quantity || 1);
        items[idx] = { ...(typeof it === 'string' ? { productId: it } : it), quantity: qty };
      } else {
        items.push({ 
          productId: finalProductId.toString(), 
          quantity: Number(quantity || 1),
          name: product?.name || '',
          image: product?.image || '',
          price: product?.price || 0
        });
      }
      return { ...(base || {}), items };
    });
    // reset add controls
    setNewItemProductId('');
    setNewItemQty(1);
  };

  const removeItemFromForm = (index) => {
    setCurrentOrderForm(prev => {
      if (!prev) return prev;
      const items = Array.isArray(prev.items) ? [...prev.items] : [];
      items.splice(index, 1);
      return { ...(prev || {}), items };
    });
  };

  const updateItemQtyInForm = (index, qty) => {
    setCurrentOrderForm(prev => {
      if (!prev) return prev;
      const items = Array.isArray(prev.items) ? [...prev.items] : [];
      if (!items[index]) return prev;
      const it = items[index];
      items[index] = { ...(typeof it === 'string' ? { productId: it } : it), quantity: Number(qty || 1) };
      return { ...(prev || {}), items };
    });
  };

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target;
    const formData = new FormData(form);
    const itemsText = formData.get('items') || '[]';
    let rawItems = [];

    // Support two input styles: JSON array (existing) or simple list (id,id or id:qty per item)

    try {
      rawItems = JSON.parse(itemsText);
      if (!Array.isArray(rawItems)) throw new Error('Items must be an array');
    } catch (err) {
      const fallback = tryParseSimpleList(itemsText);
      if (!fallback || fallback.length === 0) {
        alert('Items phải là JSON array hoặc danh sách id (vd: id1,id2 hoặc id1:2,id2:1). Ví dụ JSON: ["<productId>", {"productId":"<id>","quantity":1}]');
        setLoading(false);
        return;
      }
      rawItems = fallback;
    }

    const unresolved = new Set();
    const items = rawItems.map((it) => {
      if (typeof it === 'string' || typeof it === 'number') return { productId: String(it), quantity: 1 };
      if (it && typeof it === 'object') {
        const productId = it.productId || it.id || it._id || it.product || null;
        const quantity = (it.quantity > 0) ? it.quantity : 1;
        const obj = { productId: productId ? String(productId) : null, quantity };
        if (it.price != null) obj.price = Number(it.price);
        if (it.name) obj.name = it.name;
        if (it.image) obj.image = it.image;
        return obj;
      }
      return null;
    }).filter(i => i);

    items.forEach(it => {
      if (!it.productId) {
        // Nếu không có productId, cần đảm bảo có name và price
        if (!it.name || it.price == null) {
          unresolved.add('(item không có productId và thiếu name/price)');
        }
        return;
      }
      
      const prod = products.find(p => p._id === it.productId);
      if (prod) {
        if (it.price == null) it.price = Number(prod.price);
        if (!it.name) it.name = prod.name;
        if (!it.image) it.image = prod.image;
      } else {
        // Sản phẩm không tìm thấy - có thể đã bị xóa
        // Chỉ cảnh báo nếu thiếu thông tin cần thiết
        if (!it.name || it.price == null) {
          unresolved.add(it.productId);
        } else {
          // Có đầy đủ thông tin, set productId = null để tránh lỗi validation
          it.productId = null;
        }
      }
    });

    if (unresolved.size > 0) {
      setToast({ 
        message: `Không tìm thấy productId: ${[...unresolved].join(', ')}. Vui lòng đảm bảo các item có đầy đủ name và price!`, 
        type: 'warning' 
      });
      setLoading(false);
      return;
    }

    const computedTotal = items.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 0)), 0);
    const accountId = (formData.get('accountId') || '').toString();
    const profile = accountId ? userProfiles.find(p => String(p.accountId) === String(accountId)) : null;
    const account = accountId ? users.find(u => String(u._id) === String(accountId)) : null;

    const payload = {
      accountId,
      items,
      shipping: {
        name: (profile && profile.name) || (formData.get('shippingFullName') || '').toString(),
        phone: (profile && profile.phone) || (formData.get('shippingPhone') || '').toString(),
        address: (formData.get('shippingAddress') || '').toString(),
        email: (profile && profile.email) || (account && account.email) || (formData.get('shippingMail') || '').toString(),
      },
      total: computedTotal,
      status: formData.get('status') || 'Chờ xử lý'
    };

    try {
      if (currentOrderForm && currentOrderForm._id) {
        await updateOrder(effectiveToken, currentOrderForm._id, payload);
      } else {
        await createOrder(effectiveToken, payload);
      }
      setShowOrderFormModal(false);
      setCurrentOrderForm(null);
      await loadOrders();
      setToast({ 
        message: currentOrderForm?._id ? 'Cập nhật đơn hàng thành công!' : 'Tạo đơn hàng thành công!', 
        type: 'success' 
      });
    } catch (err) {
      console.error('Error saving order', err);
      setToast({ message: 'Có lỗi khi lưu đơn hàng', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // --- Hết logic CRUD ---

  // Filter logic
  const filteredOrders = orders.filter(o =>
    !searchQuery ||
    (o._id && o._id.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (o.email && o.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Helpers for the order detail modal (resolve profile/account when viewing an order)
  const modalProfile = currentOrder ? userProfiles.find(p => String(p.accountId) === String(currentOrder.accountId)) : null;
  const modalAccount = currentOrder ? users.find(u => String(u._id) === String(currentOrder.accountId)) : null;

  return (
    <>
      <div style={{ position: 'relative' }}>
        {loading && <Loading />}

        {/* JSX của Tab (copy từ file gốc) */}
        <div className="section-header">
          <h3>Quản lý đơn hàng</h3>
          <div>
            <input className="form-control form-control-sm" placeholder="Tìm đơn hàng theo ID hoặc email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <button type="button" className="btn-add-purple" onClick={() => openOrderForm(null)} aria-label="Tạo đơn hàng">
              <span className="add-icon">+</span>
              <span>Tạo đơn hàng</span>
            </button>
          </div>
        </div>
        <div className="admin-table-scroll">
          <table className="table table-hover" style={{ tableLayout: 'auto', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Mã ĐH</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Khách hàng</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Thanh toán</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Tổng tiền</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Ngày đặt</th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order._id}>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{order._id}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{order.accountId}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{order.paymentMethod || 'N/A'}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{(order.total || order.totalAmount || 0).toLocaleString('vi-VN')}đ</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                    <select data-status={order.status} className={`form-select form-select-sm order-status`} value={order.status} onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)} >
                      <option value="Chờ xử lý">Chờ xử lý</option>
                      <option value="Đang xử lý">Đang xử lý</option>
                      <option value="Đã gửi hàng">Đã gửi hàng</option>
                      <option value="Đã giao">Đã giao</option>
                      <option value="Đã hủy">Đã hủy</option>
                    </select>
                  </td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <button className="btn btn-sm btn-warning me-1" onClick={() => openOrderForm(order)}> Sửa </button>
                      <button className="btn btn-sm btn-info me-1" onClick={() => { setCurrentOrder(order); setShowOrderModal(true); }}> Xem </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteOrder(order._id)}> Xóa </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL Xem chi tiết đơn hàng (Tái tạo) */}
      {showOrderModal && currentOrder && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chi tiết đơn hàng: {currentOrder._id}</h5>
                <button type="button" className="btn-close" onClick={() => setShowOrderModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Thông tin khách hàng</h6>
                    <p><strong>Account ID:</strong> {currentOrder.accountId || 'N/A'}</p>
                    <p><strong>Tên tài khoản:</strong> {modalAccount?.username || modalProfile?.fullName || 'N/A'}</p>
                    <p><strong>Email:</strong> {currentOrder.shipping?.email || modalAccount?.email || modalProfile?.email || 'N/A'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6>Thông tin giao hàng</h6>
                    <p><strong>Người nhận:</strong> {currentOrder.shipping?.name || currentOrder.shipping?.fullName || modalProfile?.name || ''}</p>
                    <p><strong>SĐT:</strong> {currentOrder.shipping?.phone || modalProfile?.phone || ''}</p>
                    <p><strong>Địa chỉ:</strong> {currentOrder.shipping?.address || ''}</p>
                  </div>
                </div>

                <h6 className="mt-3">Sản phẩm</h6>
                <table className="table table-sm">
                  <thead>
                    <tr><th style={{ minWidth: 120 }}>Ảnh</th><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Tổng</th></tr>
                  </thead>
                  <tbody>
                    {(currentOrder.items || []).map((item, idx) => {
                      const pid = (item.productId || item.product || item._id || '').toString();
                      const prod = products.find(p => String(p._id) === String(pid));
                      const displayName = prod?.name || item.name || pid || 'Sản phẩm';
                      const imageUrl = prod?.image || item.image || '';
                      const price = (item.price != null) ? item.price : (prod?.price || 0);
                      const qty = item.quantity || 1;
                      return (
                        <tr key={idx}>
                          <td style={{ width: 120 }}>
                            {imageUrl ? (
                              <img src={imageUrl} alt={displayName} style={{ width: 96, height: 64, objectFit: 'cover', borderRadius: 4 }} />
                            ) : (
                              <div style={{ width: 96, height: 64, backgroundColor: '#f3f3f3', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, color: '#888', fontSize: 12 }}>No Img</div>
                            )}
                          </td>
                          <td style={{ minWidth: 200 }}>{displayName}</td>
                          <td>{qty}</td>
                          <td>{Number(price).toLocaleString('vi-VN')}đ</td>
                          <td>{((qty) * (price || 0)).toLocaleString('vi-VN')}đ</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <hr />
                <h5 className="text-end">Tổng tiền: {(currentOrder.total || currentOrder.totalAmount || 0).toLocaleString('vi-VN')}đ</h5>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowOrderModal(false)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL Tạo/Sửa đơn hàng (Tái tạo) */}
      {showOrderFormModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleSaveOrder}>
                <div className="modal-header">
                  <h5 className="modal-title">{currentOrderForm?._id ? 'Sửa đơn hàng' : 'Tạo đơn hàng'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowOrderFormModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 form-group mb-2">
                      <label>Account ID (Nếu có)</label>
                      <input list="user-accounts-list" name="accountId" className="form-control" value={currentOrderForm?.accountId || ''} onChange={e => handleAccountIdChange(e.target.value)} />
                      <datalist id="user-accounts-list">
                        {users.map(u => <option key={u._id} value={u._id}>{u.username}</option>)}
                      </datalist>
                    </div>
                    <div className="col-md-6 form-group mb-2">
                      <label>Trạng thái</label>
                      <select name="status" className="form-select" value={currentOrderForm?.status || 'Chờ xử lý'} onChange={e => setCurrentOrderForm(prev => ({ ...prev, status: e.target.value }))}>
                        <option value="Chờ xử lý">Chờ xử lý</option>
                        <option value="Đang xử lý">Đang xử lý</option>
                        <option value="Đã gửi hàng">Đã gửi hàng</option>
                        <option value="Đã giao">Đã giao</option>
                        <option value="Đã hủy">Đã hủy</option>
                      </select>
                    </div>
                  </div>
                  <hr />
                  <h6>Thông tin giao hàng (Sẽ tự điền nếu có Account ID)</h6>
                  <div className="row">
                    <div className="col-md-6 form-group mb-2">
                      <label>Tên người nhận</label>
                      <input name="shippingFullName" className="form-control" value={currentOrderForm?.shipping?.fullName || ''} onChange={e => setCurrentOrderForm(prev => ({ ...prev, shipping: { ...(prev?.shipping || {}), fullName: e.target.value } }))} required />
                    </div>
                    <div className="col-md-6 form-group mb-2">
                      <label>Số điện thoại</label>
                      <input name="shippingPhone" className="form-control" value={currentOrderForm?.shipping?.phone || ''} onChange={e => setCurrentOrderForm(prev => ({ ...prev, shipping: { ...(prev?.shipping || {}), phone: e.target.value } }))} required />
                    </div>
                    <div className="col-12 form-group mb-2">
                      <label>Địa chỉ</label>
                      <input name="shippingAddress" className="form-control" value={currentOrderForm?.shipping?.address || ''} onChange={e => setCurrentOrderForm(prev => ({ ...prev, shipping: { ...(prev?.shipping || {}), address: e.target.value } }))} required />
                    </div>
                    <div className="col-12 form-group mb-2">
                      <label>Email</label>
                      <input name="shippingMail" type="email" className="form-control" value={currentOrderForm?.shipping?.mail || ''} onChange={e => setCurrentOrderForm(prev => ({ ...prev, shipping: { ...(prev?.shipping || {}), mail: e.target.value } }))} />
                    </div>
                  </div>
                  <hr />
                  <div className="form-group mb-2">
                    <label>Thêm sản phẩm vào đơn</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input list="products-datalist" className="form-control" value={newItemProductId} onChange={e => setNewItemProductId(e.target.value)} placeholder="Nhập id hoặc tên..." />
                      <datalist id="products-datalist">
                        {products.map(p => (
                          <option key={p._id} value={`${p._id}|${p.name}`}>{p.name} ({p._id})</option>
                        ))}
                      </datalist>
                      <input type="number" min={1} className="form-control" style={{ width: 100 }} value={newItemQty} onChange={e => setNewItemQty(Number(e.target.value))} />
                      <button type="button" className="btn btn-outline-primary" onClick={() => addItemToForm(newItemProductId, newItemQty)}>Thêm</button>
                    </div>

                    <div className="mt-3">
                      <label>Các sản phẩm trong đơn</label>
                      <table className="table table-sm">
                        <thead><tr><th>Ảnh</th><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th></th></tr></thead>
                        <tbody>
                          {(currentOrderForm?.items || []).map((it, idx) => {
                            // Handle both populated and non-populated productId
                            let pid, itemData;
                            if (typeof it.productId === 'object' && it.productId !== null) {
                              // productId is populated object
                              pid = it.productId._id || it.productId.id;
                              itemData = it.productId;
                            } else {
                              // productId is string
                              pid = (it.productId || it._id || it).toString();
                              itemData = null;
                            }
                            
                            const prod = products.find(p => String(p._id) === String(pid));
                            const displayData = itemData || prod || it;
                            const displayName = displayData?.name || pid || 'Sản phẩm';
                            const displayImage = displayData?.image || '';
                            const qty = Number(it.quantity || 1);
                            const price = (it.price != null) ? it.price : (displayData?.price || 0);
                            
                            return (
                              <tr key={idx}>
                                <td style={{ width: 96 }}>
                                  {displayImage ? (
                                    <img src={displayImage} alt={displayName} style={{ width: 64, height: 40, objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ width: 64, height: 40, backgroundColor: '#f3f3f3', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, color: '#888', fontSize: 10 }}>No Img</div>
                                  )}
                                </td>
                                <td>{displayName}</td>
                                <td style={{ width: 120 }}>
                                  <input type="number" min={1} value={qty} className="form-control form-control-sm" onChange={e => updateItemQtyInForm(idx, Number(e.target.value))} />
                                </td>
                                <td style={{ width: 120 }}>{Number(price).toLocaleString('vi-VN')}đ</td>
                                <td style={{ width: 80 }}><button type="button" className="btn btn-sm btn-danger" onClick={() => removeItemFromForm(idx)}>Xóa</button></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Hidden textarea kept for backward compatibility - will be filled from currentOrderForm.items on submit */}
                    <textarea name="items" style={{ display: 'none' }} value={JSON.stringify(currentOrderForm?.items || [])} readOnly />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowOrderFormModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary">Lưu đơn hàng</button>
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
        message="Bạn có chắc chắn muốn xóa đơn hàng này không? Hành động này không thể hoàn tác."
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