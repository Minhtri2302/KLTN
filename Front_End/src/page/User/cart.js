import { useEffect, useState } from "react";
import "../../CSS/cart.css";
import { Link, useNavigate, useLocation } from "react-router-dom";
import cartService from "../../service/cart.service";
import Toast from "../../components/Toast";
import ConfirmModal from "../../components/ConfirmModal";
import Loading from "../../components/Loading";

export default function CartPage() {
  const [cart, setCart] = useState({ items: [] });
  const [selectedIds, setSelectedIds] = useState([]); // Danh sách id sản phẩm được chọn
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', itemId: null });
  const navigate = useNavigate();
  const location = useLocation();

  // 🔹 Cập nhật giỏ hàng khi load trang
  useEffect(() => {
    setLoading(true);
    setCart(cartService.getCart());
    setLoading(false);
  }, []);

  // 🔹 Tự động cập nhật khi có thay đổi ở tab khác hoặc từ component khác
  useEffect(() => {
    const handleStorageChange = () => setCart(cartService.getCart());
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // 🔹 Hiển thị thông báo thanh toán thành công nếu có param success
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("success") === "true") {
      setToast({ message: "🎉 Thanh toán thành công! Cảm ơn bạn đã mua hàng.", type: "success" });
      cartService.clearCart();
      setCart({ items: [] });
      setSelectedIds([]);
    }
  }, [location]);

  // Chọn/bỏ chọn sản phẩm
  const handleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  // Chọn/bỏ chọn tất cả
  const handleSelectAll = () => {
    if (selectedIds.length === cart.items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cart.items.map((i) => i._id));
    }
  };

  const updateQty = (id, qty) => {
    const next = { ...cart };
    const item = next.items.find((i) => i._id === id);
    if (!item) return;
    item.qty = Math.max(1, Number(qty) || 1);
    cartService.saveCart(next);
    setCart(next);
  };

  const removeItem = (id) => {
    const next = { ...cart, items: cart.items.filter((i) => i._id !== id) };
    cartService.saveCart(next);
    setCart(next);
    setSelectedIds((prev) => prev.filter((sid) => sid !== id));
    setToast({ message: 'Đã xóa sản phẩm khỏi giỏ hàng', type: 'success' });
    setConfirmModal({ isOpen: false, type: '', itemId: null });
  };

  const clear = () => {
    cartService.clearCart();
    setCart({ items: [] });
    setSelectedIds([]);
    setToast({ message: 'Đã xóa toàn bộ giỏ hàng', type: 'success' });
    setConfirmModal({ isOpen: false, type: '', itemId: null });
  };

  const handleRemoveClick = (id) => {
    setConfirmModal({ isOpen: true, type: 'remove', itemId: id });
  };

  const handleClearClick = () => {
    setConfirmModal({ isOpen: true, type: 'clear', itemId: null });
  };

  const handleConfirmAction = () => {
    if (confirmModal.type === 'remove') {
      removeItem(confirmModal.itemId);
    } else if (confirmModal.type === 'clear') {
      clear();
    }
  };

  // Tính tổng chỉ các sản phẩm được chọn
  const subtotal = cart.items.reduce(
    (s, i) =>
      selectedIds.includes(i._id)
        ? s + (Number(i.price) || 0) * (i.qty || 1)
        : s,
    0
  );

  return (
    <div className="container my-4">
      <h2>Giỏ hàng của bạn</h2>

      {loading ? (
        <Loading />
      ) : (
        <>
          {cart.items.length === 0 ? (
        <div className="empty-cart-illustration">
          Giỏ hàng trống. <Link to="/">Tiếp tục mua sắm</Link>
        </div>
      ) : (
        <div className="cart-container">
          {/* Danh sách sản phẩm */}
          <div className="cart-list">
            <div
              className="cart-list-header d-flex align-items-center mb-2"
              style={{ gap: 8 }}
            >
              <input
                type="checkbox"
                checked={
                  selectedIds.length === cart.items.length &&
                  cart.items.length > 0
                }
                onChange={handleSelectAll}
              />
              <span style={{ fontWeight: 600 }}>Chọn tất cả</span>
              <button className="cart-clear-btn ms-auto" onClick={handleClearClick}>
                Xóa toàn bộ
              </button>
            </div>
            {cart.items.map((item) => (
              <div key={item._id} className="cart-item">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item._id)}
                  onChange={() => handleSelect(item._id)}
                  style={{ marginRight: 8 }}
                />
                <img src={item.image} alt={item.name} />
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-meta">
                    {Number(item.price || 0).toLocaleString("vi-VN")}₫
                  </div>
                  <div className="cart-item-actions">
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) => updateQty(item._id, e.target.value)}
                      className="cart-qty-input"
                    />
                    <div className="fw-bold">
                      {(
                        (Number(item.price) || 0) * (item.qty || 1)
                      ).toLocaleString("vi-VN")}
                      ₫
                    </div>
                    <button
                      className="cart-remove-btn"
                      onClick={() => handleRemoveClick(item._id)}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tóm tắt thanh toán */}
          <div className="cart-summary">
            <h4>Thanh toán</h4>
            <div className="line">
              <span>Tổng</span>
              <span className="subtotal">
                {subtotal.toLocaleString("vi-VN")}₫
              </span>
            </div>
            <div className="cart-footer-buttons">
              <button className="btn-back" onClick={() => navigate(-1)}>
                ← 
              </button>
              <button
                className="checkout-btn"
                onClick={() => {
                  if (selectedIds.length === 0) {
                    setToast({ message: 'Vui lòng chọn ít nhất một sản phẩm để thanh toán', type: 'warning' });
                    return;
                  }
                  const selectedItems = cart.items.filter((i) =>
                    selectedIds.includes(i._id)
                  );
                  function utf8ToBase64(str) {
                    return window.btoa(unescape(encodeURIComponent(str)));
                  }
                  const encoded = encodeURIComponent(
                    utf8ToBase64(JSON.stringify(selectedItems))
                  );
                  navigate(`/checkout?total=${subtotal}&items=${encoded}`);
                }}
              >
                Tiến đến thanh toán
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Toast Notification */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: '' })}
        />
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: '', itemId: null })}
        onConfirm={handleConfirmAction}
        title={confirmModal.type === 'clear' ? 'Xác nhận xóa toàn bộ' : 'Xác nhận xóa sản phẩm'}
        message={
          confirmModal.type === 'clear'
            ? 'Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng không?'
            : 'Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng không?'
        }
      />
    </div>
  );
}
