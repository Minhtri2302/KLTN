import { useEffect, useState } from 'react';
import '../../CSS/profile.css';
import { useNavigate } from 'react-router-dom';
import { getUserById } from '../../service/account.service';
import { getProfileByAccountId } from '../../service/profile.service';
import {
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getUserAddresses
} from '../../service/address.service';
import AddressModal from '../../components/AddressModal';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import Loading from '../../components/Loading';

export default function AddressManagement() {
  const raw = sessionStorage.getItem('user');
  const user = raw ? JSON.parse(raw) : null;
  const accountId = user?.id || user?._id || user?.accountId || null;
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
  const [toast, setToast] = useState({ message: '', type: '' });

  useEffect(() => {
    if (!accountId) {
      setLoading(false);
      return;
    }
    const token = sessionStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const accResp = await getUserById(token, accountId).catch(() => null);
        const acc = accResp && accResp.data ? accResp.data : accResp;
        if (acc) {
          let resolvedProfile = acc.profile || null;
          if (!resolvedProfile) {
            try {
              const profileRes = await getProfileByAccountId(token, accountId).catch(() => null);
              if (profileRes) resolvedProfile = profileRes;
            } catch (e) {
              console.warn('Profile fallback fetch failed', e);
            }
          }

          const finalProfile = resolvedProfile || (acc && acc.profile) || null;
          setProfile(finalProfile || null);

          if (finalProfile && finalProfile._id) {
            loadUserAddresses(finalProfile._id, finalProfile);
          }
        }
      } catch (err) {
        console.error('Profile load error', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [accountId]);

  const loadUserAddresses = async (userId = null) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token || !userId) return;

      const addressList = await getUserAddresses(userId, token);
      let finalAddressList = addressList || [];
      setAddresses(finalAddressList);
    } catch (error) {
      console.error('Error loading addresses:', error);
    }
  };

  const handleSaveAddress = async (addressData) => {
    try {
      const token = sessionStorage.getItem('token');
      const userId = profile?._id;

      if (!token || !userId) {
        setToast({ message: 'Vui lòng đăng nhập', type: 'error' });
        return;
      }

      if (editingAddress) {
        await updateAddress(userId, editingAddress._id, addressData, token);
        setToast({ message: 'Cập nhật địa chỉ thành công', type: 'success' });
      } else {
        await addAddress(userId, addressData, token);
        setToast({ message: 'Thêm địa chỉ thành công', type: 'success' });
      }

      await loadUserAddresses(userId, profile);
      setShowAddressModal(false);
      setEditingAddress(null);
    } catch (error) {
      setToast({ message: error.message || 'Có lỗi xảy ra', type: 'error' });
    }
  };

  const handleDeleteAddress = async (addressId) => {
    setConfirmModal({ isOpen: true, id: addressId });
  };

  const confirmDeleteAddress = async () => {
    const addressId = confirmModal.id;
    if (!addressId) return;

    try {
      const token = sessionStorage.getItem('token');
      const userId = profile?._id;

      if (!token || !userId) return;

      await deleteAddress(userId, addressId, token);
      setToast({ message: 'Xóa địa chỉ thành công', type: 'success' });
      await loadUserAddresses(userId, profile);
    } catch (error) {
      setToast({ message: error.message || 'Không thể xóa địa chỉ', type: 'error' });
    } finally {
      setConfirmModal({ isOpen: false, id: null });
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      const token = sessionStorage.getItem('token');
      const userId = profile?._id;

      if (!token || !userId) return;

      await setDefaultAddress(userId, addressId, token);
      setToast({ message: 'Đã đặt làm địa chỉ mặc định', type: 'success' });
      await loadUserAddresses(userId, profile);
    } catch (error) {
      setToast({ message: error.message || 'Không thể đặt địa chỉ mặc định', type: 'error' });
    }
  };

  if (!user) return <div className="container mt-4">Vui lòng đăng nhập để quản lý địa chỉ.</div>;

  return (
    <div className="container mt-4 profile-container">
      {loading && <Loading />}

            <button className="btn-back" onClick={() => navigate(-1)}>←</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Quản lý địa chỉ giao hàng</h2>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingAddress(null);
            setShowAddressModal(true);
          }}
        >
          <i className="bi bi-plus-circle me-2"></i>
          Thêm địa chỉ mới
        </button>
      </div>

      {!loading && addresses.length === 0 ? (
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          Bạn chưa có địa chỉ nào. Hãy thêm địa chỉ giao hàng để tiện cho việc mua sắm!
        </div>
      ) : !loading ? (
        <div className="row">
          {addresses.map((addr) => (
            <div key={addr._id} className="col-md-6 col-lg-4 mb-3">
              <div
                className="card h-100"
                style={{
                  border: addr.isDefault ? '2px solid #007bff' : '1px solid #dee2e6',
                  background: addr.isDefault ? '#f0f8ff' : 'white'
                }}
              >
                <div className="card-body">
                  <div style={{ marginBottom: 12 }}>
                    <h5 className="card-title" style={{ marginBottom: 8 }}>
                      {addr.fullName}
                      {addr.isDefault && (
                        <span className="badge bg-primary ms-2">Mặc định</span>
                      )}
                    </h5>
                  </div>
                  <p className="card-text">
                    <i className="bi bi-telephone me-2"></i>
                    {addr.phone}
                  </p>
                  {addr.email && (
                    <p className="card-text">
                      <i className="bi bi-envelope me-2"></i>
                      {addr.email}
                    </p>
                  )}
                  <p className="card-text">
                    <i className="bi bi-geo-alt me-2"></i>
                    {addr.isLegacy ? (
                      addr.street
                    ) : (
                      <>
                        {addr.street}
                        {addr.ward && `, ${addr.ward}`}
                        {addr.district && `, ${addr.district}`}
                        {addr.city && `, ${addr.city}`}
                      </>
                    )}
                  </p>
                  {!addr.isLegacy && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                          setEditingAddress(addr);
                          setShowAddressModal(true);
                        }}
                      >
                        <i className="bi bi-pencil me-1"></i>
                        Sửa
                      </button>
                      {!addr.isDefault && (
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={() => handleSetDefaultAddress(addr._id)}
                        >
                          <i className="bi bi-star me-1"></i>
                          Đặt mặc định
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteAddress(addr._id)}
                      >
                        <i className="bi bi-trash me-1"></i>
                        Xóa
                      </button>
                    </div>
                  )}
                  {addr.isLegacy && (
                    <div className="alert alert-info mb-0 mt-2" style={{ fontSize: '0.85rem', padding: '8px 12px' }}>
                      <small>
                        Đây là địa chỉ từ lúc đăng ký. Bạn có thể tạo địa chỉ mới để quản lý tốt hơn.
                      </small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <AddressModal
        show={showAddressModal}
        onClose={() => {
          setShowAddressModal(false);
          setEditingAddress(null);
        }}
        onSave={handleSaveAddress}
        editAddress={editingAddress}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={confirmDeleteAddress}
        title="Xác nhận xóa địa chỉ"
        message="Bạn có chắc chắn muốn xóa địa chỉ này không?"
      />

      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      )}
    </div>
  );
}
