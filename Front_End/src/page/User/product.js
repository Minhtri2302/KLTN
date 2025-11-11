import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getProductsByCategory } from "../../service/product.service";
import { getAllCategory } from "../../service/category.service";
import axios from "axios";
import "../../CSS/product.css";
import Slider from "@mui/material/Slider";
import Toast from "../../components/Toast";
import Loading from "../../components/Loading";

export default function CategoryPage() {
  const { categoryId } = useParams();
  const [categoryName, setCategoryName] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState({ message: '', type: '' });
  const MIN = 100000;
  const MAX = 50000000;
  const STEP = 50000;
  const [priceRange, setPriceRange] = useState([MIN, MAX]);
  const [starFilter, setStarFilter] = useState("");
  const PAGE_SIZE = 8;

  useEffect(() => {
    const fetchCategoryAndProducts = async () => {
      setLoading(true);
      try {
        const categories = await getAllCategory();
        const currentCat = categories.find((cat) => cat._id === categoryId);
        if (currentCat) setCategoryName(currentCat.name);
        const productList = await getProductsByCategory(categoryId);
        setProducts(productList || []);
        if (!productList || productList.length === 0) {
          setToast({ message: 'Không có sản phẩm nào trong danh mục này.', type: 'info' });
        }
      } catch (err) {
        setToast({ message: 'Lỗi tải sản phẩm theo danh mục', type: 'error' });
        console.error("Lỗi tải sản phẩm theo danh mục:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategoryAndProducts();
  }, [categoryId]);

  const getPaginatedProducts = () => {
    const page = currentPage || 1;
    const start = (page - 1) * PAGE_SIZE;
    return (products || []).slice(start, start + PAGE_SIZE);
  };

  const getTotalPages = () => Math.max(1, Math.ceil((products?.length || 0) / PAGE_SIZE));

  const handlePageChange = (newPage) => {
    if (newPage < 1) newPage = 1;
    const total = getTotalPages();
    if (newPage > total) newPage = total;
    setCurrentPage(newPage);
  };

  // Lọc theo giá trong category
  const handleFilterByPrice = async () => {
    setLoading(true);
    try {
      const params = {};
      params.min = priceRange[0];
      params.max = priceRange[1];
      if (categoryId) params.categoryId = categoryId;
      const res = await axios.get("http://localhost:5000/products/filter-by-price", { params });
      setProducts(res.data.data || res.data || []);
      setCurrentPage(1);
      if (!res.data.data || res.data.data.length === 0) {
        setToast({ message: 'Không có sản phẩm phù hợp với bộ lọc giá.', type: 'info' });
      }
    } catch (err) {
      setToast({ message: "Lỗi lọc theo giá", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Lọc theo số sao trong category
  const handleFilterByStar = async () => {
    if (!starFilter) return;
    setLoading(true);
    try {
      const params = { star: starFilter };
      if (categoryId) params.categoryId = categoryId;
      const res = await axios.get("http://localhost:5000/products/filter-by-star", { params });
      setProducts(res.data.data || res.data || []);
      setCurrentPage(1);
      if (!res.data.data || res.data.data.length === 0) {
        setToast({ message: 'Không có sản phẩm phù hợp với bộ lọc sao.', type: 'info' });
      }
    } catch (err) {
      setToast({ message: "Lỗi lọc theo số sao", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container my-5">
  <h2 className="mb-4 text-start">{categoryName || "Danh mục sản phẩm"}</h2>
      <div className="row">
        {/* Bộ lọc bên trái */}
        <div className="col-12 col-md-3 mb-4">
          <div className="card p-3 shadow-sm">
            <h5 className="mb-3">Bộ lọc</h5>
            <label className="w-100">Chọn khoảng giá (₫):</label>
            <div className="w-100 px-2">
              <Slider
                value={priceRange}
                min={MIN}
                max={MAX}
                step={STEP}
                onChange={(_, newValue) => setPriceRange(newValue)}
                valueLabelDisplay="off"
                getAriaLabel={() => 'Khoảng giá'}
                getAriaValueText={v => `${v.toLocaleString('vi-VN')}₫`}
                sx={{ color: '#2563eb', height: 8 }}
              />
              <div className="d-flex justify-content-between w-100 mt-2">
                <span>{Number(priceRange[0]).toLocaleString('vi-VN')}₫</span>
                <span>{Number(priceRange[1]).toLocaleString('vi-VN')}₫</span>
              </div>
            </div>
            <button className="btn btn-primary mt-2 w-100" onClick={handleFilterByPrice}>
              Lọc theo giá
            </button>
            <hr />
            <label className="w-100 mb-2">Lọc theo số sao:</label>
            <div className="star-filter-vertical mb-2 px-1" style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              {[5,4,3,2,1].map(star => (
                <label key={star} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                  <input
                    type="radio"
                    name="starFilter"
                    value={star}
                    checked={starFilter == star}
                    onChange={() => setStarFilter(star)}
                    style={{ marginRight: 8 }}
                  />
                  {Array.from({length: 5}).map((_, i) => (
                    <span key={i} style={{ color: i < star ? '#f5b301' : '#ccc', fontSize: 18, marginRight: 1 }}>
                      {i < star ? '★' : '☆'}
                    </span>
                  ))}
                </label>
              ))}
            </div>
            <button className="btn btn-primary w-100" onClick={handleFilterByStar}>
              Lọc theo sao
            </button>
          </div>
        </div>
        {/* Sản phẩm bên phải */}
        <div className="col-12 col-md-9">
          {loading ? (
            <Loading />
          ) : products.length > 0 ? (
            <>
              <div className="row">
                {getPaginatedProducts().map((prod) => (
                  <div className="col-12 col-md-4 col-lg-3 mb-4" key={prod._id}>
                    <div className="product-item d-flex flex-column align-items-center text-center">
                      <Link to={`/product/${prod._id}`} className="w-100">
                        <img src={prod.image} alt={prod.name} className="img-fluid product-thumbnail" />
                        <h3 className="product-title mt-2">{prod.name}</h3>
                      </Link>
                      <strong className="product-price mt-2" style={{ color: '#b71c1c', fontSize: '1.2rem' }}>{Number(prod.price).toLocaleString('vi-VN')}₫</strong>
                      {/* Hiển thị số sao trung bình */}
                      <div className="product-rating mt-2" style={{ fontWeight: 600, fontSize: '1rem' }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} style={{ color: prod.roundedStar && prod.roundedStar > 0 && i < prod.roundedStar ? '#f5b301' : '#d1d5db', fontSize: 22 }}>
                            {i < (prod.roundedStar || 0) ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                      <div className="d-flex justify-content-center gap-2 mt-3 w-100">
                        <Link to={`/product/${prod._id}`} className="btn add-to-cart-btn">Thêm vào giỏ</Link>
                        <Link to={`/product/${prod._id}`} className="btn buy-now-btn ">Mua ngay</Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {products.length > PAGE_SIZE && (
                <nav className="pagination-container mt-4 mb-4">
                  <ul className="pagination justify-content-center">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>Trước</button>
                    </li>
                    {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map(p => (
                      <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => handlePageChange(p)}>{p}</button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === getTotalPages() ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>Tiếp</button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          ) : (
            <div className="alert alert-info text-center">
              Không có sản phẩm trong danh mục này.
            </div>
          )}
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
    </div>
  );
}
