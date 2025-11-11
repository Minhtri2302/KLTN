import { useState, useEffect } from "react";
import "../../CSS/cart.css";
import "../../CSS/checkout.css";
import { clearCart } from "../../service/cart.service";
import { createOrder } from "../../service/order.service";
import { createCheckoutSession } from "../../service/payment.service";
import { useNavigate, useLocation } from "react-router-dom";
import Toast from "../../components/Toast";
import ConfirmModal from "../../components/ConfirmModal";
import AddressModal from "../../components/AddressModal";
import Loading from "../../components/Loading";
import { 
  addAddress, 
  updateAddress, 
  deleteAddress, 
  getUserAddresses 
} from "../../service/address.service";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [pollingSessionId, setPollingSessionId] = useState(null);
  const [paymentChecking, setPaymentChecking] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, addressId: null });
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    paymentMethod: "Tiền mặt",
  });

  // Lấy danh sách sản phẩm từ param items (ưu tiên), nếu không có thì lấy từ cart cũ
  useEffect(() => {
    let items = [];
    const params = new URLSearchParams(location.search);
    const encoded = params.get("items");
    if (encoded) {
      try {
        // Giải mã base64 UTF-8 an toàn
        function base64ToUtf8(str) {
          return decodeURIComponent(escape(window.atob(str)));
        }
        items = JSON.parse(base64ToUtf8(decodeURIComponent(encoded)));
      } catch (e) {
        items = [];
      }
    }
    setCart({ items });
    setLoading(false);

    // 🕓 Stripe redirect check
    const sid = params.get("session_id");
    if (sid) setPollingSessionId(sid);

    // Lấy user profile nếu cần
    try {
      const raw = sessionStorage.getItem("user");
      if (raw) {
        const user = JSON.parse(raw);
        const profile = user.profile || user;
        setUserProfile(profile);
        loadUserAddresses(profile._id || user._id, profile);
      }
    } catch (err) {}
  }, [location.search]);

  // Load danh sách địa chỉ của user
  const loadUserAddresses = async (userId, profileData = null) => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token || !userId) return;

      const addressList = await getUserAddresses(userId, token);
      let finalAddressList = addressList || [];

      // Sử dụng profileData được truyền vào hoặc state userProfile
      const currentProfile = profileData || userProfile;

      // Kiểm tra xem có địa chỉ cũ (từ profile.address) không
      // Nếu có và chưa nằm trong mảng addresses, thêm vào như một địa chỉ "legacy"
      if (currentProfile && currentProfile.address && typeof currentProfile.address === "string" && currentProfile.address.trim()) {
        const oldAddress = currentProfile.address.trim();
        
        // Kiểm tra xem địa chỉ cũ đã có trong danh sách chưa
        const addressExists = finalAddressList.some(addr => {
          const fullAddr = [addr.street, addr.ward, addr.district, addr.city].filter(Boolean).join(", ");
          return fullAddr === oldAddress || addr.street === oldAddress;
        });

        // Nếu chưa có, thêm địa chỉ cũ vào đầu danh sách
        if (!addressExists) {
          finalAddressList.unshift({
            _id: 'legacy-address', // ID đặc biệt để phân biệt
            fullName: currentProfile.name || currentProfile.fullName || form.name || 'Người nhận',
            phone: currentProfile.phone || currentProfile.phoneNumber || form.phone || '',
            street: oldAddress,
            ward: '',
            district: '',
            city: '',
            isDefault: finalAddressList.length === 0, // Nếu không có địa chỉ nào khác, đặt làm mặc định
            isLegacy: true // Đánh dấu là địa chỉ cũ
          });
        }
      }

      setAddresses(finalAddressList);

      // Không tự động chọn địa chỉ mặc định nữa
      // User sẽ phải tự chọn địa chỉ từ dropdown
    } catch (error) {
      console.error("Error loading addresses:", error);
    }
  };

  // Cập nhật form với địa chỉ được chọn
  const updateFormWithAddress = (address) => {
    if (!address) return;
    
    let fullAddress;
    
    // Nếu là địa chỉ cũ (legacy), dùng trực tiếp
    if (address.isLegacy) {
      fullAddress = address.street;
    } else {
      // Địa chỉ mới có cấu trúc đầy đủ
      fullAddress = [
        address.street,
        address.ward,
        address.district,
        address.city
      ].filter(Boolean).join(", ");
    }

    setForm(prev => ({
      ...prev,
      name: address.fullName || prev.name,
      phone: address.phone || prev.phone,
      email: address.email || prev.email,
      address: fullAddress
    }));
  };

  // Xử lý chọn địa chỉ
  const handleSelectAddress = (e) => {
    const addressId = e.target.value;
    setSelectedAddressId(addressId);
    
    const selectedAddr = addresses.find(addr => addr._id === addressId);
    if (selectedAddr) {
      updateFormWithAddress(selectedAddr);
    }
  };

  // Xử lý lưu địa chỉ (thêm hoặc sửa)
  const handleSaveAddress = async (addressData) => {
    try {
      const token = sessionStorage.getItem("token");
      const userId = userProfile?._id;

      if (!token || !userId) {
        setToast({ message: "Vui lòng đăng nhập", type: "error" });
        return;
      }

      if (editingAddress) {
        // Cập nhật địa chỉ
        await updateAddress(userId, editingAddress._id, addressData, token);
        setToast({ message: "Cập nhật địa chỉ thành công", type: "success" });
      } else {
        // Thêm địa chỉ mới
        await addAddress(userId, addressData, token);
        setToast({ message: "Thêm địa chỉ thành công", type: "success" });
      }

      // Reload danh sách địa chỉ
      await loadUserAddresses(userId, userProfile);
      setShowAddressModal(false);
      setEditingAddress(null);
    } catch (error) {
      setToast({ message: error.message || "Có lỗi xảy ra", type: "error" });
    }
  };

  // Xử lý xóa địa chỉ
  const handleDeleteAddress = async (addressId) => {
    setConfirmModal({ isOpen: true, addressId });
  };

  const confirmDeleteAddress = async () => {
    const addressId = confirmModal.addressId;
    if (!addressId) return;

    try {
      const token = sessionStorage.getItem("token");
      const userId = userProfile?._id;

      if (!token || !userId) return;

      await deleteAddress(userId, addressId, token);
      setToast({ message: "Xóa địa chỉ thành công", type: "success" });
      
      // Reload danh sách địa chỉ
      await loadUserAddresses(userId, userProfile);
      
      // Nếu địa chỉ bị xóa đang được chọn, reset selection
      if (selectedAddressId === addressId) {
        setSelectedAddressId(null);
      }
    } catch (error) {
      setToast({ message: error.message || "Không thể xóa địa chỉ", type: "error" });
    } finally {
      setConfirmModal({ isOpen: false, addressId: null });
    }
  };

  // 🔄 Poll stripe session status
  useEffect(() => {
    if (!pollingSessionId) return;
    
    // 🔒 Ngăn gọi trùng API khi reload
    if (sessionStorage.getItem(`checked_${pollingSessionId}`)) {
      // Đã xử lý trước đó, bỏ qua
      setPaymentChecking(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    setPaymentChecking(true);

    const check = async () => {
      attempts++;
      try {
        const res = await fetch(
          `http://localhost:5000/payments/session-status?session_id=${encodeURIComponent(
            pollingSessionId
          )}`
        );
        const data = await res.json();
        const status = data?.status || "unknown";

        if (status === "paid" || status === "succeeded" || data.clearCart) {
          // Đánh dấu đã xử lý session này
          sessionStorage.setItem(`checked_${pollingSessionId}`, "1");

          const rawUser = sessionStorage.getItem("user");
          const parsed = rawUser ? JSON.parse(rawUser) : {};
          const name =
            parsed?.profile?.name || parsed?.name || form.name || "Khách hàng";
          const email =
            parsed?.profile?.email || parsed?.email || form.email || "";

          // ⚠️ QUAN TRỌNG: Lấy total từ backend vì cart có thể đã bị clear sau redirect
          const totalAmount = data.order?.total || data.order?.totalAmount || data.session?.amount_total ;

          // Lấy orderId từ backend response (ưu tiên) hoặc từ metadata
          const orderId = data.order?.id || data.order?._id || data.session?.metadata?.orderId || pollingSessionId;

          // Set order success với thông tin từ backend
          setOrderSuccess({
            id: orderId,
            name,
            total: totalAmount,
            email,
          });

          // ✅ Clear cart SAU KHI đã lưu thông tin
          clearCart();
          setCart({ items: [] });
          window.dispatchEvent(new Event("cartUpdated"));

          // remove session_id from URL
          const u = new URL(window.location.href);
          u.searchParams.delete("session_id");
          window.history.replaceState({}, "", u.toString());
          setPaymentChecking(false);
          return;
        }

        if (attempts < 30 && !cancelled) setTimeout(check, 2000);
      } catch (e) {
        if (attempts < 30 && !cancelled) setTimeout(check, 2000);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [pollingSessionId]);

  // 🧮 Total
  const calcTotal = () =>
    (cart.items || []).reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0);

  // 🧾 Handle change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // 💳 Confirm order
  const handleConfirm = async () => {
    // Ưu tiên lấy thông tin từ địa chỉ đã chọn
    let orderInfo = null;
    
    if (selectedAddressId) {
      const selectedAddr = addresses.find(addr => addr._id === selectedAddressId);
      if (selectedAddr) {
        // Sử dụng thông tin từ địa chỉ đã chọn
        const fullAddress = [
          selectedAddr.street,
          selectedAddr.ward,
          selectedAddr.district,
          selectedAddr.city
        ].filter(Boolean).join(", ");

        orderInfo = {
          name: selectedAddr.fullName,
          email: userProfile?.email || form.email,
          phone: selectedAddr.phone,
          address: fullAddress,
          // Lưu thêm thông tin chi tiết
          street: selectedAddr.street,
          ward: selectedAddr.ward,
          district: selectedAddr.district,
          city: selectedAddr.city
        };

        // Chỉ lưu addressId nếu KHÔNG phải legacy address
        if (!selectedAddr.isLegacy && selectedAddr._id !== 'legacy-address') {
          orderInfo.addressId = selectedAddr._id;
        }
      }
    }
    
    // Nếu không có địa chỉ được chọn, dùng thông tin từ form
    if (!orderInfo) {
      orderInfo = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address
      };
    }

    if (!orderInfo?.name || !orderInfo?.email || !orderInfo?.phone || !orderInfo?.address) {
      setToast({ message: "Vui lòng điền đầy đủ thông tin giao hàng", type: "warning" });
      return;
    }

    const token = sessionStorage.getItem("token");
    if (!token) {
      setToast({ message: "Vui lòng đăng nhập để đặt hàng", type: "warning" });
      navigate("/login");
      return;
    }

    const items = (cart.items || []).map((i) => ({
      productId: i._id,
      name: i.name,
      image: i.image || '',
      price: i.price,
      quantity: i.qty,
    }));

    const payload = {
      items,
      shipping: orderInfo,
      paymentMethod: form.paymentMethod,
      total: calcTotal(),
    };

    setSubmitting(true);
    try {
      if (payload.paymentMethod === "Thẻ") {
        const session = await createCheckoutSession(token, payload);
        if (session?.url) {
          window.location.href = session.url;
          return;
        }
        throw new Error("Không thể tạo phiên thanh toán");
      }

      const res = await createOrder(token, payload);
      const orderId = res?.id || res?._id || res?.data?.id || res?.data?._id;

      if (!orderId) {
        setToast({ message: res?.message || "Đặt hàng thất bại", type: "error" });
        return;
      }

      setOrderSuccess({
        id: orderId,
        name: orderInfo.name,
        total: calcTotal(),
        email: orderInfo.email,
      });
      clearCart();
      setCart({ items: [] });
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.error("createOrder error", err);
      setToast({ message: err.message || "Lỗi khi đặt hàng", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Đang tải đơn hàng...</div>;

  return (
    <div className="container my-5">
      {/* Loading khi đang check thanh toán Stripe */}
      {paymentChecking && <Loading message="Đang xác nhận thanh toán" />}

      {orderSuccess && (
        <div className="order-success-overlay">
          <div className="order-success-card">
            <div className="tick">✓</div>
            <h3>Thanh toán thành công!</h3>
            <p>
              Cảm ơn <strong>{orderSuccess.name}</strong> đã mua hàng.
            </p>
            <p>Mã đơn: <strong>{orderSuccess.id}</strong></p>
            <p>
              Tổng tiền:{" "}
              <strong>{orderSuccess.total.toLocaleString("vi-VN")}₫</strong>
            </p>
            {orderSuccess.email && (
              <p>
                Email xác nhận sẽ được gửi đến:{" "}
                <strong>{orderSuccess.email}</strong>
              </p>
            )}
            <div className="order-success-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setOrderSuccess(null);
                  navigate("/");
                }}
              >
                Về trang chủ
              </button>
              <button
                className="btn btn-outline-primary"
                onClick={() => {
                  setOrderSuccess(null);
                  navigate("/orders");
                }}
              >
                Xem đơn hàng
              </button>
            </div>
          </div>
        </div>
      )}

      <h2>Thanh toán</h2>
      <div className="row">
        {/* Thông tin giao hàng */}
        <div className="col-md-6">
          <h4>Thông tin người nhận</h4>

          {/* Danh sách địa chỉ */}
          {addresses.length > 0 && (
            <div className="mb-3">
              <label className="form-label">Chọn địa chỉ giao hàng</label>
              <div className="d-flex gap-2">
                <select 
                  className="form-select"
                  value={selectedAddressId || ""}
                  onChange={handleSelectAddress}
                >
                  <option value="">-- Chọn địa chỉ --</option>
                  {addresses.map(addr => (
                    <option key={addr._id} value={addr._id}>
                      {addr.fullName} - {addr.phone} - {addr.street}
                      {addr.city && `, ${addr.city}`}
                      {addr.isDefault ? " (Mặc định)" : ""}
                      {addr.isLegacy ? " (Địa chỉ đăng ký)" : ""}
                    </option>
                  ))}
                </select>
                <button 
                  className="btn btn-outline-primary"
                  onClick={() => {
                    setEditingAddress(null);
                    setShowAddressModal(true);
                  }}
                  style={{ whiteSpace: "nowrap" }}
                >
                  + Thêm
                </button>
              </div>

              {/* Hiển thị địa chỉ đã chọn */}
              {selectedAddressId && (
                <div className="selected-address-card mt-2 p-3 border rounded">
                  {(() => {
                    const addr = addresses.find(a => a._id === selectedAddressId);
                    return addr ? (
                      <>
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <strong>{addr.fullName}</strong> | {addr.phone}
                            {addr.isDefault && <span className="badge bg-primary ms-2">Mặc định</span>}
                            {addr.isLegacy && <span className="badge bg-secondary ms-2">Địa chỉ đăng ký</span>}
                            <div className="text-muted mt-1">
                              {addr.isLegacy ? (
                                // Địa chỉ cũ - hiển thị trực tiếp
                                addr.street
                              ) : (
                                // Địa chỉ mới - hiển thị đầy đủ
                                <>
                                  {addr.street}{addr.ward && `, ${addr.ward}`}
                                  {addr.district && `, ${addr.district}`}{addr.city && `, ${addr.city}`}
                                </>
                              )}
                            </div>
                          </div>
                          {!addr.isLegacy && (
                            <div className="d-flex gap-2">
                              <button 
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => {
                                  setEditingAddress(addr);
                                  setShowAddressModal(true);
                                }}
                              >
                                Sửa
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteAddress(addr._id)}
                              >
                                Xóa
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Nút thêm địa chỉ nếu chưa có địa chỉ nào */}
          {addresses.length === 0 && (
            <div className="mb-3">
              <button 
                className="btn btn-primary w-100"
                onClick={() => {
                  setEditingAddress(null);
                  setShowAddressModal(true);
                }}
              >
                + Thêm địa chỉ giao hàng
              </button>
            </div>
          )}

          {["name", "email", "phone", "address"].map((f) => (
            <div className="mb-2" key={f}>
              <label className="form-label">
                {f === "name"
                  ? "Họ và tên"
                  : f === "email"
                  ? "Email"
                  : f === "phone"
                  ? "Số điện thoại"
                  : "Địa chỉ"}
              </label>
              {f === "address" ? (
                <textarea
                  name={f}
                  value={form[f]}
                  onChange={handleChange}
                  className="form-control"
                  readOnly={!!userProfile}
                />
              ) : (
                <input
                  name={f}
                  value={form[f]}
                  onChange={handleChange}
                  className="form-control"
                  readOnly={!!userProfile}
                />
              )}
            </div>
          ))}

          <div className="mb-2">
            <label className="form-label">Phương thức thanh toán</label>
            <select
              name="paymentMethod"
              value={form.paymentMethod}
              onChange={handleChange}
              className="form-select"
            >
              <option value="Tiền mặt">Tiền mặt khi nhận hàng (COD)</option>
              <option value="Thẻ">Thẻ (thanh toán online)</option>
            </select>
          </div>

          <div className="d-flex gap-2 mt-3">
            <button
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting ? "Đang xử lý..." : "Xác nhận & Thanh toán"}
            </button>
          </div>
        </div>

        {/* Tóm tắt đơn hàng */}
        <div className="col-md-6">
          <h4>Đơn hàng của bạn</h4>
          {cart.items.length === 0 ? (
            <div className="alert alert-info">Không có sản phẩm nào được chọn để thanh toán</div>
          ) : (
            <ul className="list-group checkout-order-list">
              {cart.items.map((it) => (
                <li key={it._id} className="list-group-item d-flex justify-content-between">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img className="checkout-thumb" src={it.image} alt={it.name} />
                    <div>
                      <strong>{it.name}</strong>
                      <div>Số lượng: {it.qty}</div>
                    </div>
                  </div>
                  <div>
                    {(it.price * it.qty).toLocaleString("vi-VN")}₫
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 text-end">
            <strong>Tổng cộng: {calcTotal().toLocaleString("vi-VN")}₫</strong>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: '' })}
        />
      )}

      {/* Address Modal */}
      <AddressModal 
        show={showAddressModal}
        onClose={() => {
          setShowAddressModal(false);
          setEditingAddress(null);
        }}
        onSave={handleSaveAddress}
        editAddress={editingAddress}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, addressId: null })}
        onConfirm={confirmDeleteAddress}
        title="Xác nhận xóa địa chỉ"
        message="Bạn có chắc chắn muốn xóa địa chỉ này không?"
      />
    </div>
  );
}
