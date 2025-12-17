import  { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../CSS/profile.css';
import { getOrdersByUser, cancelOrder } from '../../service/order.service';
import { searchProducts } from '../../service/product.service';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Loading from '../../components/Loading';

export default function OrderHistory() {
  const raw = sessionStorage.getItem('user');
  const user = raw ? JSON.parse(raw) : null;
  const accountId = user?.id || user?._id || user?.accountId || null;
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [productsMap, setProductsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [cancellingOrders, setCancellingOrders] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });

  const statusLabel = (status) => String(status || '');

  const formatAddress = (addr) => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    if (typeof addr === 'object') {
      const a = addr;
      const parts = [];
      if (a.line1) parts.push(a.line1);
      if (a.line2) parts.push(a.line2);
      if (a.city) parts.push(a.city);
      if (a.state) parts.push(a.state);
      if (a.postal_code) parts.push(a.postal_code);
      if (a.country) parts.push(a.country);
      return parts.filter(Boolean).join(', ');
    }
    return String(addr);
  };

  useEffect(() => {
    if (!accountId) {
      setLoading(false);
      return;
    }
    const token = sessionStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const ordersResp = await getOrdersByUser(token, accountId).catch(() => []);
        setOrders(ordersResp || []);
      } catch (err) {
        console.error('Orders load error', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [accountId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await searchProducts();
        const list = Array.isArray(data) ? data : data?.data || [];
        const map = {};
        list.forEach(p => {
          if (p && p._id) map[p._id] = p;
        });
        if (!cancelled) setProductsMap(map);
      } catch (err) {
        console.error('loadProducts in OrderHistory', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCancelOrder = async (orderId) => {
    if (!orderId) return;
    const token = sessionStorage.getItem('token');
    if (!token) {
      setToast({ message: 'Vui lòng đăng nhập', type: 'warning' });
      return;
    }
    const current = orders.find(o => String(o._id) === String(orderId));
    if (!current) {
      setToast({ message: 'Đơn hàng không tồn tại', type: 'warning' });
      return;
    }
    if (String(current.status) !== 'Chờ xử lý') {
      setToast({ message: 'Chỉ có đơn đang chờ xử lý mới có thể hủy', type: 'warning' });
      return;
    }

    setOrderToCancel(orderId);
    setShowConfirmModal(true);
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel) return;
    const token = sessionStorage.getItem('token');

    try {
      setCancellingOrders(prev => [...prev, String(orderToCancel)]);
      setToast({ message: 'Đang hủy đơn...', type: 'info' });
      await cancelOrder(token, orderToCancel);
      setOrders(prev => prev.map(o => (String(o._id) === String(orderToCancel) ? { ...(o || {}), status: 'Đã hủy' } : o)));
      setToast({ message: 'Đã hủy đơn hàng thành công', type: 'success' });
    } catch (err) {
      console.error('cancelOrder', err);
      setToast({ message: err?.message || 'Lỗi khi hủy đơn', type: 'error' });
    } finally {
      setCancellingOrders(prev => prev.filter(id => String(id) !== String(orderToCancel)));
      setShowConfirmModal(false);
      setOrderToCancel(null);
    }
  };

  if (!user) return <div className="container mt-4">Vui lòng đăng nhập để xem lịch sử đơn hàng.</div>;

  return (
    <div className="container mt-4 profile-container">
      {loading && <Loading />}

    <button className="btn-back" onClick={() => navigate(-1)}>←</button>
      <h2 className="mb-4">Lịch sử đơn hàng</h2>
      {orders.length === 0 ? (
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          Bạn chưa có đơn hàng nào
        </div>
      ) : (
        <div className="review-list-scroll" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {orders.map((o, idx) => (
            <div className="card mb-3" key={o._id || idx}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: 16 }}>Đơn hàng {o._id}</strong>
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    Ngày đặt: {o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ marginBottom: 6 }}>
                    Trạng thái: <span className={`badge ${
                      o.status === 'Đã giao' ? 'bg-success' :
                      o.status === 'Đã hủy' ? 'bg-danger' :
                      o.status === 'Đang xử lý' ? 'bg-warning' :
                      'bg-secondary'
                    }`}>{statusLabel(o.status)}</span>
                  </div>
                  {String(o.status) === 'Chờ xử lý' && (
                    <div style={{ marginTop: 6 }}>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleCancelOrder(o._id)}
                        disabled={cancellingOrders.includes(String(o._id))}
                      >
                        {cancellingOrders.includes(String(o._id)) ? 'Đang hủy...' : 'Hủy đơn'}
                      </button>
                    </div>
                  )}
                  {o.paymentMethod && (
                    <div style={{ marginBottom: 6, fontSize: 13 }}>
                      <i className="bi bi-credit-card me-1"></i>
                      {o.paymentMethod === 'cod' ? 'Tiền mặt (COD)' :
                        o.paymentMethod === 'card' ? 'Thẻ / Online' :
                          o.paymentMethod === 'momo' ? 'Ví Momo' :
                            o.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : o.paymentMethod}
                    </div>
                  )}
                  <div style={{ fontWeight: 600, fontSize: 16, color: '#dc3545' }}>
                    Tổng: {(o.total || 0).toLocaleString('vi-VN')}₫
                  </div>
                </div>
              </div>
              <div className="card-body">
                <h6><i className="bi bi-box-seam me-2"></i>Sản phẩm</h6>
                {o.items && o.items.length > 0 ? (
                  <div className="mb-3">
                    {o.items.map((it, i) => {
                      const pid = it.productId && (typeof it.productId === 'string' ? it.productId : (it.productId._id || ''));
                      const productFromMap = pid ? productsMap[pid] : null;
                      const image = it.image || it.productImage || (productFromMap && (productFromMap.image || productFromMap.productImage)) || '';
                      const displayName = it.name || (productFromMap && (productFromMap.name || productFromMap.title)) || pid || 'Sản phẩm';
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            border: '1px solid #f0f0f0',
                            borderRadius: 6,
                            marginBottom: 8,
                            background: '#fafafa'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 72,
                                height: 56,
                                background: '#fff',
                                borderRadius: 6,
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #eee'
                              }}
                            >
                              {image ? (
                                <img src={image} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ color: '#999', fontSize: 11 }}>No image</div>
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{displayName}</div>
                              <div className="text-muted" style={{ fontSize: 13 }}>
                                Số lượng: {it.quantity} × {(it.price || 0).toLocaleString('vi-VN')}₫
                              </div>
                            </div>
                          </div>
                          <div style={{ fontWeight: 600 }}>
                            {((it.price || 0) * (it.quantity || 1)).toLocaleString('vi-VN')}₫
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-muted">Không có sản phẩm nào trong đơn.</div>
                )}

                <h6><i className="bi bi-truck me-2"></i>Thông tin giao hàng</h6>
                {(o.shipping || o.email || user) ? (
                  <div className="mb-2">
                    <p className="mb-1">
                      <strong>Người nhận:</strong> {(o.shipping && (o.shipping.fullName || o.shipping.name)) || o.name || o.email || user?.username || ''}
                    </p>
                    <p className="mb-1">
                      <strong>Email:</strong> {(o.shipping && o.shipping.email) || o.email || user?.email || ''}
                    </p>
                    <p className="mb-1">
                      <strong>SĐT:</strong> {(o.shipping && o.shipping.phone) || o.phone || ''}
                    </p>
                    <p className="mb-0">
                      <strong>Địa chỉ:</strong> {formatAddress((o.shipping && o.shipping.address) || o.address) || ''}
                    </p>
                  </div>
                ) : (
                  <div className="text-muted">Không có thông tin giao hàng</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setOrderToCancel(null);
        }}
        onConfirm={confirmCancelOrder}
        title="Xác nhận hủy đơn hàng"
        message="Bạn có chắc chắn muốn hủy đơn hàng này không?"
      />

      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      )}
    </div>
  );
}