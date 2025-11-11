import '../CSS/footer.css';

export default function Footer() {
  return (
    <footer className="user-footer">
      <div className="container">
        <div className="row">
          <div className="col-md-4">
            <h5>Về cửa hàng</h5>
            <p>Chúng tôi chuyên cung cấp các loại xe đạp chất lượng: xe đạp đường phố, địa hình, xe đạp trẻ em và phụ kiện đi kèm.</p>
          </div>
          <div className="col-md-4">
            <h5>Liên hệ</h5>
            <p>Email: support@xedapshop.vn</p>
            <p>Hotline: 0909 123 456</p>
            <p>Địa chỉ: 123 Đường Thắng Lợi, Quận 1, TP. Hồ Chí Minh</p>
          </div>
          <div className="col-md-4">
            <h5>Theo dõi</h5>
            <p>
              <a href="#">Facebook</a> | <a href="#">Instagram</a> | <a href="#">YouTube</a>
            </p>
            <p className="mt-2">
              <a href="/policy">Chính sách đổi trả</a>
            </p>
          </div>
        </div>
        <div className="user-footer-copyright">
          &copy; 2025 XeĐạpShop. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}
