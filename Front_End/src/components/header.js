import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getAllCategory } from "../service/category.service";
import cartService from "../service/cart.service";
import { getProfileById, getProfileByAccountId } from "../service/profile.service";
import "../CSS/header.css";

export default function Header({ authUserProp, onLogout }) {
  const navRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  const defaultUserIconUrl =
    "https://res.cloudinary.com/dyefelufh/image/upload/v1760624976/kltu_products/aajhzwjgaonpf3t6utfk.svg";

  // Lấy avatar từ profile (ưu tiên), fallback sang authUser.avatar hoặc default
  const avatarUrl = useMemo(() => {
    if (profile?.avatar) return profile.avatar;
    if (authUser?.avatar) return authUser.avatar;
    return defaultUserIconUrl;
  }, [profile, authUser]);

  // Lấy danh mục + giỏ hàng + user + profile (dùng getProfileById)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getAllCategory();
        setCategories(data || []);
      } catch (err) {
        console.error("Lỗi khi tải danh mục:", err);
      }

      try {
        const c = cartService.getCart();
        setCartCount((c.items && c.items.length) || 0);
      } catch (err) {
        console.error("Lỗi khi tải giỏ hàng:", err);
      }

      try {
        const raw = sessionStorage.getItem("user");
        if (raw) {
          const user = JSON.parse(raw);
          setAuthUser(user);
          // Lấy profile từ backend nếu có token và id
          const token = sessionStorage.getItem("token");
          const id = user?.profile._id || null;
          const accountId = user?.accountId || null;
          let prof = null;
          if (token && id) {
            try {
              prof = await getProfileById(token, id);
            } catch (err) {
              // Nếu lấy theo _id bị lỗi thì thử lấy theo accountId
              if (accountId) {
                try {
                  prof = await getProfileByAccountId(token, accountId);
                } catch (e) { }
              }
            }
          }
          setProfile(prof);
        }
      } catch (err) { }
    };
    fetchData();
  }, []);

  // ✅ Giữ phần nội dung không bị che bởi header cố định
  useEffect(() => {
    const setBodyPadding = () => {
      const el = navRef.current;
      if (el) document.body.style.paddingTop = `${el.getBoundingClientRect().height}px`;
    };
    setBodyPadding();
    window.addEventListener("resize", setBodyPadding);
    return () => {
      window.removeEventListener("resize", setBodyPadding);
      document.body.style.paddingTop = null;
    };
  }, []);

  // ✅ Cập nhật authUser khi props thay đổi
  useEffect(() => {
    if (authUserProp) setAuthUser(authUserProp);
    else setAuthUser(null);
  }, [authUserProp]);

  // ✅ Cập nhật giỏ hàng khi đổi trang hoặc khi có sự kiện cartUpdated
  useEffect(() => {
    const updateCartCount = () => {
      try {
        const c = cartService.getCart();
        setCartCount((c.items && c.items.length) || 0);
      } catch (err) {
        console.error("Lỗi khi tải giỏ hàng:", err);
      }
    };
    updateCartCount();
    window.addEventListener("cartUpdated", updateCartCount);
    return () => {
      window.removeEventListener("cartUpdated", updateCartCount);
    };
  }, [location]);

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setAuthUser(null);
    if (onLogout) onLogout();
    navigate("/login");
  };

  return (
    <nav ref={navRef} className="navbar navbar-expand-md navbar-dark bg-dark">
      <div className="container">
        <Link className="navbar-brand fw-bold text-uppercase" to="/">
          BikeShop
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarContent"
          aria-controls="navbarContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav ms-auto mb-2 mb-md-0">
            <li className={`nav-item ${location.pathname === "/" ? "active" : ""}`}>
              <Link className="nav-link" to="/">Trang chủ</Link>
            </li>

            <li className={`nav-item dropdown ${location.pathname.startsWith("/category") ? "active" : ""}`}>
              <div
                className="nav-link dropdown-toggle"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                style={{ cursor: "pointer" }}
              >
                Sản phẩm
              </div>
              <ul className="dropdown-menu">
                {categories.map((cat) => (
                  <li key={cat._id}>
                    <Link className="dropdown-item" to={`/category/${cat._id}`}>
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>

            <li className={`nav-item ${location.pathname === "/contact" ? "active" : ""}`}>
              <Link className="nav-link" to="/contact">Liên hệ</Link>
            </li>
            <li className={`nav-item ${location.pathname === "/news" ? "active" : ""}`}>
              <Link className="nav-link" to="/news">Tin tức</Link>
            </li>
          </ul>
          {/* Ô tìm kiếm */}
          <form
            className="d-flex mt-3 mt-md-0 ms-md-3"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (searchText && searchText.trim()) {
                navigate(`/search?search=${encodeURIComponent(searchText.trim())}`);
              }
            }}
          >
            <input
              type="text"
              className="form-control"
              placeholder="Tìm kiếm..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <button className="btn btn-outline-light ms-2" type="submit">
              Tìm
            </button>
          </form>
          {/* Avatar + Menu người dùng */}
          <ul className="navbar-nav ms-3 mb-2 mb-md-0">
            <li className="nav-item me-2">
              {authUser ? (
                <Link className="nav-link d-flex align-items-center" to="/profileinfo">
                  <img
                    src={avatarUrl}
                    alt="User"
                    width={50}
                    height={50}
                    style={{
                      borderRadius: "50%",
                    }}
                  />
                  <span className="ms-2">{profile?.name || authUser.username}</span>
                </Link>
              ) : (
                <Link className="nav-link" to="/login">
                  <img src={defaultUserIconUrl} alt="User" width={24} />
                </Link>
              )}
            </li>

            {/* Giỏ hàng */}
            <li>
              <Link
                className={`nav-link cart-link ${cartCount > 0 ? "has-items" : ""}`}
                to="/cart"
              >
                <img
                  src="https://res.cloudinary.com/dyefelufh/image/upload/v1760625212/cart_qtbvdz.svg"
                  alt="Cart"
                  width={24}
                />
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
