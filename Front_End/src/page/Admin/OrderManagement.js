import React, { useState, useEffect } from 'react';
// Import service CẦN THIẾT
import { listOrders, updateOrder } from '../../service/order.service';
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

  const [toast, setToast] = useState({ message: '', type: '' });

  // Load data khi component được mount
  useEffect(() => {
    loadData();
  }, []);



  const loadData = async () => {
    try {
      setLoading(true);
      const ordersList = await listOrders(effectiveToken);
      setOrders(ordersList);
    } catch (error) {
      console.error('Error loading order data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  // --- Hết logic CRUD ---

  // Filter logic
  const filteredOrders = orders.filter(o =>
    !searchQuery ||
    (o._id && o._id.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (o.email && o.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );



  return (
    <>
      <div style={{ position: 'relative' }}>
        {loading && <Loading />}

        {/* JSX của Tab (copy từ file gốc) */}
        <div className="section-header">
          <h3>Quản lý đơn hàng</h3>
          <div>
            <input className="form-control form-control-sm" placeholder="Tìm đơn hàng theo ID hoặc email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
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
                    <button className="btn btn-sm btn-info" onClick={() => { setCurrentOrder(order); setShowOrderModal(true); }}> Xem </button>
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
                    <p><strong>Email:</strong> {currentOrder.shipping?.email || 'N/A'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6>Thông tin giao hàng</h6>
                    <p><strong>Người nhận:</strong> {currentOrder.shipping?.name || currentOrder.shipping?.fullName || ''}</p>
                    <p><strong>SĐT:</strong> {currentOrder.shipping?.phone || ''}</p>
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
                      const displayName = item.name || 'Sản phẩm';
                      const imageUrl = item.image || '';
                      const price = item.price || 0;
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