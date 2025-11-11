import React, { useState, useEffect } from "react";
import "../CSS/AddressModal.css";

export default function AddressModal({ 
  show, 
  onClose, 
  onSave, 
  editAddress = null 
}) {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    street: "",
    ward: "",
    district: "",
    city: "",
    isDefault: false,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editAddress) {
      setFormData({
        fullName: editAddress.fullName || "",
        phone: editAddress.phone || "",
        email: editAddress.email || "",
        street: editAddress.street || "",
        ward: editAddress.ward || "",
        district: editAddress.district || "",
        city: editAddress.city || "",
        isDefault: editAddress.isDefault || false,
      });
    } else {
      setFormData({
        fullName: "",
        phone: "",
        email: "",
        street: "",
        ward: "",
        district: "",
        city: "",
        isDefault: false,
      });
    }
    setErrors({});
  }, [editAddress, show]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Xóa lỗi khi user nhập
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Vui lòng nhập họ tên";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Vui lòng nhập số điện thoại";
    } else if (!/^[0-9]{10,11}$/.test(formData.phone)) {
      newErrors.phone = "Số điện thoại không hợp lệ";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Vui lòng nhập email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ";
    }
    if (!formData.street.trim()) {
      newErrors.street = "Vui lòng nhập địa chỉ";
    }
    if (!formData.city.trim()) {
      newErrors.city = "Vui lòng chọn Tỉnh/Thành phố";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  if (!show) return null;

  return (
    <div className="address-modal-overlay">
      <div className="address-modal-content">
        <div className="address-modal-header">
          <h3>{editAddress ? "Cập nhật địa chỉ" : "Thêm địa chỉ mới"}</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="address-form">
          <div className="form-group">
            <label>
              Họ và tên <span className="required">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Nhập họ và tên"
              className={errors.fullName ? "error" : ""}
            />
            {errors.fullName && <span className="error-text">{errors.fullName}</span>}
          </div>

          <div className="form-group">
            <label>
              Số điện thoại <span className="required">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Nhập số điện thoại"
              className={errors.phone ? "error" : ""}
            />
            {errors.phone && <span className="error-text">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label>
              Email <span className="required">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Nhập email"
              className={errors.email ? "error" : ""}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label>
              Địa chỉ cụ thể <span className="required">*</span>
            </label>
            <input
              type="text"
              name="street"
              value={formData.street}
              onChange={handleChange}
              placeholder="Số nhà, tên đường..."
              className={errors.street ? "error" : ""}
            />
            {errors.street && <span className="error-text">{errors.street}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phường/Xã</label>
              <input
                type="text"
                name="ward"
                value={formData.ward}
                onChange={handleChange}
                placeholder="Nhập phường/xã"
              />
            </div>

            <div className="form-group">
              <label>Quận/Huyện</label>
              <input
                type="text"
                name="district"
                value={formData.district}
                onChange={handleChange}
                placeholder="Nhập quận/huyện"
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              Tỉnh/Thành phố <span className="required">*</span>
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Nhập tỉnh/thành phố"
              className={errors.city ? "error" : ""}
            />
            {errors.city && <span className="error-text">{errors.city}</span>}
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleChange}
              />
              <span>Đặt làm địa chỉ mặc định</span>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn-save">
              {editAddress ? "Cập nhật" : "Thêm địa chỉ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
