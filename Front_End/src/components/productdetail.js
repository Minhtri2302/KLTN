import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProductsById } from "../service/product.service";
import { getReviewsByProduct, getReviewsSummary, createReview, canUserReviewProduct } from "../service/review.service";
import "../CSS/productdetail.css";
import "../CSS/loading.css";
import { addItem } from "../service/cart.service";
import Toast from "./Toast";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate(); 
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1); 
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ avgRating: 0, count: 0 });
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [canReview, setCanReview] = useState({ canReview: false, reason: '' });
  const [toast, setToast] = useState({ message: '', type: '' });

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        const data = await getProductsById(id);
        if (!data) {
          setError("Sản phẩm không tồn tại");
        } else {
          setProduct(data);
        }
      } catch (err) {
        console.error("Lỗi khi tải sản phẩm:", err);
        setError("Lỗi server");
      } finally {
        setLoading(false);
      }
    };

    const fetchReviews = async () => {
      if (!id) return;
      try {
        const s = await getReviewsSummary(id);
        setSummary(s || { avgRating: 0, count: 0 });
      } catch (e) {
        // ignore
      }
      try {
        const list = await getReviewsByProduct(id);
        setReviews(list || []);
      } catch (e) {
      }
      // Kiểm tra xem user có thể đánh giá không
      if (currentUser) {
        try {
          const result = await canUserReviewProduct(id);
          setCanReview(result);
        } catch (e) {
          setCanReview({ canReview: false, reason: 'Lỗi khi kiểm tra quyền đánh giá' });
        }
      }
    };

    fetchProduct();
    fetchReviews();
  }, [id]);

  const handleAddToCart = () => {
    // Kiểm tra đăng nhập
    if (!currentUser) {
      setToast({ message: 'Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng', type: 'warning' });
      setTimeout(() => navigate('/login'), 1500);
      return;
    }

    if (!product) return;
    if (quantity < 1) {
      setToast({ message: 'Vui lòng chọn số lượng hợp lệ!', type: 'warning' });
      return;
    }
    try {
      addItem(product, quantity);
      setToast({ message: `Đã thêm ${quantity} ${product.name} vào giỏ hàng!`, type: 'success' });
    } catch (err) {
      console.error('Lỗi khi thêm vào giỏ:', err);
      setToast({ message: 'Không thể thêm vào giỏ hàng, vui lòng thử lại.', type: 'error' });
      return;
    }
    // Không quay lại trang trước nữa
  };

  const currentUser = (() => {
    try {
      const u = sessionStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch (e) { return null; }
  })();

  const handleSubmitReview = async () => {
    if (!currentUser) {
      setToast({ message: 'Bạn cần đăng nhập để gửi đánh giá', type: 'warning' });
      return;
    }
    if (!id) return;
    if (!(rating >= 1 && rating <= 5)) {
      setToast({ message: 'Rating không hợp lệ', type: 'warning' });
      return;
    }
    if (!(String(comment || '').trim().length >= 3)) {
      setToast({ message: 'Vui lòng nhập nhận xét (ít nhất 3 ký tự)', type: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      await createReview({ productId: id, rating, comment });
      setComment('');
      setRating(0);
      // refresh reviews and check permission again
      const s = await getReviewsSummary(id);
      setSummary(s || { avgRating: 0, count: 0 });
      const list = await getReviewsByProduct(id);
      setReviews(list || []);
      const result = await canUserReviewProduct(id);
      setCanReview(result);
      setToast({ message: 'Gửi đánh giá thành công', type: 'success' });
    } catch (err) {
      console.error('Lỗi gửi review', err);
      setToast({ message: err.message || 'Gửi đánh giá thất bại', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="loading-overlay">
      <div className="loading-spinner"></div>
      <p className="loading-text">Đang tải sản phẩm<span className="loading-dots"></span></p>
    </div>
  );
  if (error) return <div className="alert alert-danger">{error}</div>;
  return (
    <div>
      <button className="btn-back" onClick={() => navigate(-1)}>←</button>
      <div className="product-detail container my-5">
      <div className="row">
        <div className="col-md-6">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="img-fluid product-detail-image"
            />
          ) : (
            <div className="bg-light d-flex align-items-center justify-content-center" style={{ height: 300 }}>
              <span>Không có ảnh</span>
            </div>
          )}
          {/* Specifications and stock info (moved under image) */}
          {product.specifications ? (
            <div className="product-specifications mt-3">
              <h3>Thông số kỹ thuật</h3>
              <p className="mb-1">{product.specifications}</p>
            </div>
          ) : null}

          {product.stock !== undefined && product.stock !== null ? (
            <div className="product-stock mt-2">
              
            </div>
          ) : null}
        </div>
        <div className="col-md-6">
          <h1 className="product-detail-title">{product.name}</h1>
          <p className="product-detail-price">
            {product.price ? `${product.price.toLocaleString()}₫` : "Liên hệ"}
          </p>
          <p className="product-detail-description">{product.description}</p>
          <div className="d-flex align-items-center mb-3">
            <label className="me-2">Số lượng:</label>
            <input
              type="number"
              min={1}
              max={product.stock !== undefined && product.stock !== null ? product.stock : undefined}
              value={quantity}
              onChange={(e) => {
                const v = Number(e.target.value) || 1;
                if (product.stock !== undefined && product.stock !== null) {
                  setQuantity(Math.max(1, Math.min(v, Number(product.stock))));
                } else {
                  setQuantity(Math.max(1, v));
                }
              }}
              className="form-control w-25"
            />
            {product.stock > 0 ? (
                <div className="ms-3" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong>Tình trạng:</strong> 
                  <span style={{ fontSize: '0.9rem', color: '#16a34a' }}>
                    Còn {product.stock} sản phẩm
                  </span>
                </div>
              ) : (
                <div className="ms-3">
                  <strong>Tình trạng:</strong> <span className="text-danger">Hết hàng</span>
                </div>
              )}
          </div>

          <div className="d-flex gap-2 w-100 mt-2" style={{ justifyContent: 'flex-start' }}>
            {product.stock !== undefined && product.stock <= 0 ? (
              <div className="alert alert-danger w-100 mb-0">
                <strong>Sản phẩm hiện tại đã hết hàng</strong>
              </div>
            ) : (
              <>
                <button
                  className="add-to-cart-btn"
                  onClick={handleAddToCart}
                >
                  Thêm vào giỏ
                </button>
                <button
                  className="buy-now-btn"
                  onClick={() => {
                    // Kiểm tra đăng nhập
                    if (!currentUser) {
                      setToast({ message: 'Vui lòng đăng nhập để mua hàng', type: 'warning' });
                      setTimeout(() => navigate('/login'), 1500);
                      return;
                    }

                    if (product.stock !== undefined && product.stock <= 0) {
                      setToast({ message: 'Sản phẩm đã hết hàng', type: 'warning' });
                      return;
                    }
                    try {
                      addItem(product, quantity);
                    } catch (err) {
                      console.error('Lỗi khi thêm vào giỏ (Mua ngay):', err);
                      setToast({ message: 'Không thể thêm sản phẩm vào giỏ, vui lòng thử lại', type: 'error' });
                      return;
                    }
                    navigate(`/cart`);
                  }}
                >
                  Mua ngay
                </button>
              </>
            )}
          </div>
          <hr />
          <div className="product-reviews mt-4">
            <h5>Đánh giá sản phẩm</h5>
            <div className="d-flex align-items-center mb-2">
              <div className="me-2 d-flex align-items-center">
                {summary.count === 0 || !summary.roundedStar ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} style={{ color: '#ccc', fontSize: 18, marginRight: 4 }}>☆</span>
                  ))
                ) : (
                  <>
                    <span style={{ color: '#f5b301', fontSize: 18, fontWeight: 600 }}>
                      {'★'.repeat(summary.roundedStar).padEnd(5, '☆')}
                    </span>
                    <span style={{ marginLeft: 8, color: '#333', fontSize: 15 }}>
                      {summary.roundedStar ? summary.roundedStar.toFixed(1) : '0.0'} / 5.0
                    </span>
                  </>
                )}
              </div>
              <div>
                {summary.count === 0 || !summary.roundedStar ? (
                  <span>Chưa có đánh giá</span>
                ) : (
                  <span>({summary.count} đánh giá)</span>
                )}
              </div>
            </div>

            {currentUser ? (
              canReview.canReview ? (
                <div className="review-form mb-3">
                  <label className="d-block">Chọn sao:</label>
                  <div className="star-rating mb-2" style={{ fontSize: 22 }}>
                    {Array.from({ length: 5 }).map((_, i) => {
                      const starValue = i + 1;
                      let filled = false;
                      if (hoverRating > 0) {
                        filled = starValue <= hoverRating;
                      } else if (rating > 0) {
                        filled = starValue <= rating;
                      } 
                      return (
                        <button
                          key={starValue}
                          type="button"
                          onClick={() => setRating(starValue)}
                          onMouseEnter={() => setHoverRating(starValue)}
                          onMouseLeave={() => setHoverRating(0)}
                          aria-label={`${starValue} sao`}
                          className="btn btn-link p-0 me-1"
                          style={{ color: filled ? '#f5b301' : '#ccc', textDecoration: 'none' }}
                        >
                          {filled ? '★' : '☆'}
                        </button>
                      );
                    })}
                  </div>
                  <textarea className="form-control mb-2" rows={3} placeholder="Viết nhận xét (bắt buộc, tối thiểu 3 ký tự)" value={comment} onChange={e => setComment(e.target.value)} />
                  <div className="mb-2 text-muted small">Bạn phải nhập nhận xét (ít nhất 3 ký tự) và chọn số sao trước khi gửi.</div>
                  <button className="btn btn-primary" disabled={submitting || !(rating >= 1 && rating <= 5 && String(comment || '').trim().length >= 3)} onClick={handleSubmitReview}>{submitting ? 'Đang gửi...' : 'Gửi đánh giá'}</button>
                </div>
              ) : null
            ) : (
              <div className="mb-3">Bạn cần <a href="/login">đăng nhập</a> để gửi đánh giá.</div>
            )}

            <div className="review-list-scroll">
              <div className="review-list">
                {reviews.length === 0 ? <div>Chưa có đánh giá nào</div> : (
                  reviews.map(r => {
                    return (
                      <div key={r._id} className="card mb-2 p-2">
                        <div>
                          <strong>{r.userId && r.userId.name ? r.userId.name : ''}</strong>{' '}
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} style={{ color: i < r.rating ? '#f5b301' : '#ccc', marginLeft: i === 0 ? 6 : 0 }}>
                              {i < r.rating ? '★' : '☆'}
                            </span>
                          ))}
                        </div>
                        {r.comment ? <div className="mt-1">{r.comment}</div> : null}
                        <div className="text-muted small mt-1">{new Date(r.createdAt).toLocaleString()}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
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
    </div>
  );
}