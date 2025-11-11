import { useEffect, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { searchProducts } from "../../service/product.service";
import Toast from "../../components/Toast";
import Loading from "../../components/Loading";
import "../../CSS/home.css";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function SearchResults() {
  const query = useQuery();
  const search = query.get("search") || "";
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });
  const PAGE_SIZE = 8;

  useEffect(() => {
    const runSearch = async () => {
      // Không tìm kiếm nếu search text rỗng
      if (!search || !search.trim()) {
        setProducts([]);
        setPagination(null);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const result = await searchProducts(search.trim(), currentPage, PAGE_SIZE);
        setProducts(result.products || []);
        setPagination(result.pagination || null);
        if (!result.products || result.products.length === 0) {
          setToast({ message: `Không tìm thấy sản phẩm nào phù hợp với "${search}"`, type: 'info' });
        }
      } catch (err) {
        console.error("Search error:", err);
        setProducts([]);
        setPagination(null);
        setToast({ message: 'Lỗi khi tìm kiếm sản phẩm', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    runSearch();
  }, [search, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage < 1) newPage = 1;
    if (pagination && newPage > pagination.totalPages) newPage = pagination.totalPages;
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigate = useNavigate();

  return (
    <>
      {loading && <Loading message="Đang tìm kiếm" />}
      
      <div className="container my-5">
        <h2 className="mb-4 text-center">
          {search ? `Kết quả tìm kiếm cho "${search}"${!loading && pagination ? ` (${pagination.total} sản phẩm)` : ''}` : "Tìm kiếm sản phẩm"}
        </h2>
        
        {!loading && (!search || !search.trim()) ? (
          <div className="alert alert-warning text-center">
            Vui lòng nhập từ khóa để tìm kiếm sản phẩm.
          </div>
        ) : !loading && products.length === 0 ? (
          <div className="alert alert-info text-center">
            Không tìm thấy sản phẩm nào phù hợp với từ khóa "{search}".
          </div>
        ) : !loading && (
          <div className="row">
            {products.map((prod) => (
              <div key={prod._id} className="col-12 col-md-4 col-lg-3 mb-4">
                <div className="product-item d-flex flex-column align-items-center text-center">
                  <Link to={`/product/${prod._id}`} className="w-100">
                    {prod.image && <img src={prod.image} alt={prod.name} className="img-fluid product-thumbnail" />}
                    <h3 className="product-title mt-2">{prod.name}</h3>
                  </Link>
                  <strong className="product-price mt-2" style={{ color: '#b71c1c', fontSize: '1.2rem' }}>
                    {Number(prod.price).toLocaleString('vi-VN')}₫
                  </strong>
                  
                  {/* Hiển thị số sao trung bình */}
                  <div className="product-rating mt-2" style={{ fontWeight: 600, fontSize: '1rem' }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span 
                        key={i} 
                        style={{ 
                          color: prod.roundedStar && prod.roundedStar > 0 && i < prod.roundedStar ? '#f5b301' : '#d1d5db', 
                          fontSize: 22 
                        }}
                      >
                        {i < (prod.roundedStar || 0) ? '★' : '☆'}
                      </span>
                    ))}
                  </div>
                  
                  <div className="d-flex justify-content-center gap-2 mt-3 w-100">
                    <Link to={`/product/${prod._id}`} className="btn add-to-cart-btn">Thêm vào giỏ</Link>
                    <Link to={`/product/${prod._id}`} className="btn buy-now-btn">Mua ngay</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination && pagination.totalPages > 1 && (
          <nav className="pagination-container mt-4 mb-4">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>Trước</button>
              </li>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => handlePageChange(p)}>{p}</button>
                </li>
              ))}
              <li className={`page-item ${currentPage === pagination.totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>Tiếp</button>
              </li>
            </ul>
          </nav>
        )}
      </div>
      
      {/* Toast Notification */}
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
