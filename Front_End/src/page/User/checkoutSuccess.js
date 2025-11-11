import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearCart } from "../../service/cart.service";
import "../../CSS/checkout.css";

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Đang kiểm tra trạng thái giao dịch...");
  const [busy, setBusy] = useState(true);
  const [orderSuccess, setOrderSuccess] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session_id = params.get("session_id");

    if (!session_id) {
      setMessage("Không tìm thấy session_id — vui lòng kiểm tra đơn hàng trong trang cá nhân.");
      setBusy(false);
      return;
    }

    // 🔒 Ngăn gọi trùng API khi reload
    if (sessionStorage.getItem(`checked_${session_id}`)) {
      setMessage("✅ Thanh toán thành công! Đơn hàng đã được xác nhận trước đó.");
      setBusy(false);
      return;
    }

    const apiBase = (process.env.REACT_APP_API_BASE || "http://localhost:5000").replace(/\/+$/, "");
    const url = `${apiBase}/payments/session-status?session_id=${encodeURIComponent(session_id)}`;

    (async () => {
      try {
        setBusy(true);
        const resp = await fetch(url, {
          method: "GET",
          headers: { "Accept": "application/json" },
        });

        if (!resp.ok) {
          console.error("session-status error:", resp.status);
          setMessage("Không thể kiểm tra trạng thái giao dịch (lỗi server). Vui lòng thử lại sau.");
          setBusy(false);
          return;
        }

        const data = await resp.json();
        const status = (data.status || "").toLowerCase();

        if (status === "paid" || data.clearCart === true) {
          // ✅ Chỉ clear cart khi backend xác nhận thanh toán
          try { clearCart(); } catch (e) { /* ignore */ }
          setMessage("✅ Thanh toán thành công! Email xác nhận sẽ được gửi nếu có địa chỉ email.");
          // đánh dấu là đã xử lý session này
          sessionStorage.setItem(`checked_${session_id}`, "1");
          
          // Lấy thông tin user để hiển thị
          const rawUser = sessionStorage.getItem("user");
          const parsed = rawUser ? JSON.parse(rawUser) : {};
          const userName = parsed?.profile?.name || parsed?.name || "Khách hàng";
          const userEmail = parsed?.profile?.email || parsed?.email || "";
          
          // Lấy orderId từ metadata của Stripe session
          const orderId = data.session?.metadata?.orderId || session_id;
          
          setOrderSuccess({
            id: orderId,
            name: userName,
            email: userEmail,
          });
        } else {
          setMessage("Thanh toán chưa hoàn tất. Vui lòng kiểm tra trạng thái đơn hàng trong trang cá nhân.");
        }
      } catch (err) {
        console.error("Error calling session-status", err);
        setMessage("Lỗi khi kiểm tra trạng thái giao dịch. Vui lòng thử lại sau.");
      } finally {
        setBusy(false);
      }
    })();
  }, [navigate]);

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      {orderSuccess && (
        <div className="order-success-overlay">
          <div className="order-success-card">
            <div className="tick">✓</div>
            <h3>Thanh toán thành công!</h3>
            <p>
              Cảm ơn <strong>{orderSuccess.name}</strong> đã mua hàng.
            </p>
            <p>Mã giao dịch: <strong>{orderSuccess.id}</strong></p>
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
                  navigate("/profile#orders");
                }}
              >
                Xem đơn hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {!orderSuccess && (
        <>
          {busy && (
            <div style={{ marginBottom: "20px" }}>
              <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}>
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}
          <p>{message}</p>
          {busy && <p>Vui lòng chờ trong giây lát...</p>}
        </>
      )}
    </div>
  );
}
