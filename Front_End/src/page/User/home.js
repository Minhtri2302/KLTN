import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllCategory } from "../../service/category.service";
import { getProductsByCategory } from "../../service/product.service";
import { getAllBanners } from "../../service/banner.service";
import { getHomeTopNews } from "../../service/news.service";
import "../../CSS/home.css";
import Loading from "../../components/Loading";

export default function Home() {
  const CATEGORY_PLACEHOLDER =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250"><rect fill="%23f8f9fa" width="100%" height="100%"/><text x="50%" y="50%" font-size="18" dominant-baseline="middle" text-anchor="middle" fill="%23999">No image</text></svg>';

  const [categories, setCategories] = useState([]);
  const [productsByCategory, setProductsByCategory] = useState({});
  const [currentPage, setCurrentPage] = useState({});
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bannersLoaded, setBannersLoaded] = useState(false);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);

  const PAGE_SIZE = 4;

  // 🟢 Lấy danh mục
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getAllCategory();
        setCategories(data || []);
        const initPages = {};
        (data || []).forEach(cat => (initPages[cat._id] = 1));
        setCurrentPage(initPages);
      } catch (err) {
        console.error("Lỗi tải danh mục:", err);
      } finally {
        setCategoriesLoaded(true);
      }
    };
    fetchCategories();
  }, []);

  // 🟢 Lấy banner
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const result = await getAllBanners(1, 3); // page=1, pageSize=3
        const data = result.banners || [];
        
        if (!Array.isArray(data) || data.length === 0) {
          setSlides([]);
          return;
        }
        const normalized = data.map(b => ({
          id: b._id || b.id,
          image: (b.image || b.imageUrl || "").toString().trim(),
          active:
            typeof b.active !== "undefined"
              ? !!b.active
              : b.isActive === true,
        }));

        const activeBanners = normalized.filter(b => b.active && b.image);
        const seen = new Set();
        const unique = activeBanners
          .filter(b => {
            if (seen.has(b.image)) return false;
            seen.add(b.image);
            return true;
          })
          .map(b => ({ image: b.image, id: b.id }));

        setSlides(unique);
      } catch (err) {
        console.error("Lỗi tải banners:", err);
        setSlides([]);
      } finally {
        setBannersLoaded(true);
      }
    };
    fetchBanners();
  }, []);

  // 🟢 Lấy sản phẩm theo danh mục (page=1, pageSize=4)
  useEffect(() => {
    if (!categories.length) return;
    const fetchProducts = async () => {
      try {
        const results = {};
        for (const cat of categories) {
          const data = await getProductsByCategory(cat._id, 1, 4);
          // getProductsByCategory đã trả về mảng products
          results[cat._id] = Array.isArray(data) ? data : [];
        }
        setProductsByCategory(results);
      } catch (err) {
        console.error("Lỗi tải sản phẩm:", err);
      } finally {
        setProductsLoaded(true);
      }
    };
    fetchProducts();
  }, [categories]);

  // 🟢 Kiểm tra tất cả dữ liệu đã load xong
  useEffect(() => {
    if (bannersLoaded && categoriesLoaded && productsLoaded) {
      setLoading(false);
    }
  }, [bannersLoaded, categoriesLoaded, productsLoaded]);

  // 🟢 Tự động chuyển slide
  useEffect(() => {
    if (!slides.length) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides]);

  // 🟢 Lấy tin tức
  useEffect(() => {
    const loadNews = async () => {
      setNewsLoading(true);
      try {
        const list = await getHomeTopNews();
        setNewsItems(list || []);
      } catch (err) {
        console.error("Lỗi tải tin tức:", err);
        setNewsItems([]);
      } finally {
        setNewsLoading(false);
      }
    };
    loadNews();
  }, []);

  // 🧩 Hàm hỗ trợ phân trang sản phẩm
  const getPaginatedProducts = categoryId => {
    const all = productsByCategory[categoryId] || [];
    const page = currentPage[categoryId] || 1;
    const start = (page - 1) * PAGE_SIZE;
    return all.slice(start, start + PAGE_SIZE);
  };

  // 🧩 Chuyển trang
  const handlePageChange = (categoryId, newPage) => {
    setCurrentPage(prev => ({ ...prev, [categoryId]: newPage }));
  };

  const nextSlide = () =>
    setCurrentSlide(prev => (prev + 1) % slides.length);
  const prevSlide = () =>
    setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);

  return (
    <div>
      {loading ? (
        <Loading />
      ) : (
        <>
          {/* === SLIDER === */}
          {slides.length > 0 && (
        <div className="slider-container">
          <div className="slider-wrapper">
            {slides.map((slide, idx) => (
              <div
                key={idx}
                className={`hero-slide ${idx === currentSlide ? "active" : ""}`}
                style={{
                  backgroundImage: `url(${slide.image})`,
                }}
              />
            ))}
          </div>

          <button className="slider-btn slider-btn-prev" onClick={prevSlide}>
            &#10094;
          </button>
          <button className="slider-btn slider-btn-next" onClick={nextSlide}>
            &#10095;
          </button>

          <div className="slider-dots">
            {slides.map((_, idx) => (
              <span
                key={idx}
                className={`dot ${currentSlide === idx ? "active" : ""}`}
                onClick={() => setCurrentSlide(idx)}
              />
            ))}
          </div>
        </div>
      )}

      {/* === PRODUCT SECTION === */}
      {/* === PRODUCT SECTION === */}
      <div className="product-section container my-5">
        {categories.map(cat => (
          <div key={cat._id} className="category-block mb-5">
            {/* Bỏ align-items-start */}
            <div className="row">
              {/* Ảnh danh mục */}
              {/* Thêm d-flex flex-column */}
              <div className="col-md-3 d-flex flex-column align-items-center justify-content-center">
                <h3 className="category-name-over-image mb-2">{cat.name}</h3>
                <Link to={`/category/${cat._id}`} title={cat.name} className="category-thumb-link d-block position-relative" style={{ width: '100%' }}>
                  <img
                    src={(cat.image || cat.imageUrl || CATEGORY_PLACEHOLDER).toString()}
                    alt={cat.name}
                    className="img-fluid rounded category-thumb"
                    style={{ display: 'block', margin: '0 auto' }} // Không dùng h-100, không objectFit cover
                    onError={e => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = CATEGORY_PLACEHOLDER;
                    }}
                  />
                </Link>
              </div>

              {/* Sản phẩm */}
              <div className="col-md-9">
                <div className="d-flex justify-content-end align-items-center mb-3">
                  <Link
                    to={`/category/${cat._id}`}
                    className="btn btn-sm btn-outline-primary"
                  >
                    Xem tất cả
                  </Link>
                </div>

                {productsByCategory[cat._id]?.length > 0 ? (
                  <div className="row">
                    {getPaginatedProducts(cat._id).map(prod => (
                      <div
                        className="col-12 col-md-6 col-lg-3 mb-4"
                        key={prod._id}
                      >
                        <div className="product-item d-flex flex-column justify-content-between align-items-center text-center" style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', padding: 12, height: 370, minHeight: 370, maxHeight: 370 }}>
                          <div className="product-badge">NEW</div>
                          <Link to={`/product/${prod._id}`} className="w-100">
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="img-fluid product-thumbnail"
                              style={{ height: 180, width: '100%', objectFit: 'contain', background: '#fff', borderRadius: 10, display: 'block', marginBottom: 6 }}
                            />
                          </Link>
                          <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center w-100" style={{ minHeight: 0 }}>
                            <h3 className="product-title w-100" style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: 6, marginBottom: 4, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', textAlign: 'center' }}>{prod.name}</h3>
                            <strong className="product-price w-100" style={{ display: 'block', marginTop: 4, fontWeight: 'bold', color: '#e63946', fontSize: '1.1rem', marginBottom: 4, textAlign: 'center' }}>
                              {prod.price.toLocaleString()}₫
                            </strong>
                            <div className="product-rating w-100" style={{ fontWeight: 600, fontSize: '1rem', minHeight: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginBottom: 0, textAlign: 'center' }}>
                              <span>
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <span key={i} style={{ color: prod.roundedStar && prod.roundedStar > 0 && i < prod.roundedStar ? '#f5b301' : '#d1d5db', fontSize: 20 }}>
                                    {i < (prod.roundedStar || 0) ? '★' : '☆'}
                                  </span>
                                ))}
                              </span>
                            </div>
                          </div>
                          <div className="d-flex justify-content-center gap-2 mt-0 w-100">
                            <Link to={`/product/${prod._id}`} className="btn add-to-cart-btn" style={{ flex: 1, fontSize: 14, height: 40, borderRadius: 8, color: '#fff', padding: '0 0', textAlign: 'center', textDecoration: 'none', fontWeight: 500 }}>Thêm vào giỏ</Link>
                            <Link to={`/product/${prod._id}`} className="btn buy-now-btn" style={{ flex: 1, fontSize: 14, height: 40, borderRadius: 8, color: '#fff', padding: '0 0', textAlign: 'center', textDecoration: 'none', fontWeight: 500 }}>Mua ngay</Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="alert alert-info">
                    Không có sản phẩm trong danh mục này.
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* === NEWS SECTION === */}
      <div className="container my-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Tin tức</h2>
          <Link to="/news" className="btn btn-sm btn-outline-primary">
            Xem tất cả
          </Link>
        </div>

        {newsLoading ? (
          <div>Đang tải tin tức...</div>
        ) : newsItems && newsItems.length > 0 ? (
          <div className="row">
            {newsItems.map(n => (
              <div key={n._id || n.id} className="col-md-4 mb-3">
                <div className="card h-100">
                  {n.image && (
                    <img
                      src={n.image}
                      alt={n.title}
                      className="card-img-top"
                      style={{ maxHeight: 160, objectFit: "cover" }}
                    />
                  )}
                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title">{n.title}</h5>
                    <p className="card-text" style={{ flex: 1 }}>
                      {(n.content || "").slice(0, 120)}
                      {(n.content || "").length > 120 ? "..." : ""}
                    </p>
                    <div>
                      <div>
                        <small className="text-muted">
                          👁️ {typeof n.views === 'number' ? n.views : 0} lượt xem
                        </small>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mt-1">
                        <small className="text-muted">
                          {n.author || ""} {n.publishedAt ? `- ${new Date(n.publishedAt).toLocaleDateString("vi-VN")}` : ""}
                        </small>
                        <Link
                          to={`/news/${n._id || n.id}`}
                          className="btn btn-sm btn-primary"
                        >
                          Xem
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="alert alert-info">Chưa có tin tức.</div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
