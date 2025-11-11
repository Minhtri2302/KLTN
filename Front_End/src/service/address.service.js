const API_BASE_URL = "http://localhost:5000";

// Thêm địa chỉ mới cho user
export const addAddress = async (userId, addressData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/addresses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(addressData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to add address");
    }

    return await response.json();
  } catch (error) {
    console.error("Error adding address:", error);
    throw error;
  }
};

// Cập nhật địa chỉ
export const updateAddress = async (userId, addressId, addressData, token) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/users/${userId}/addresses/${addressId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addressData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update address");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating address:", error);
    throw error;
  }
};

// Xóa địa chỉ
export const deleteAddress = async (userId, addressId, token) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/users/${userId}/addresses/${addressId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to delete address");
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting address:", error);
    throw error;
  }
};

// Đặt địa chỉ làm mặc định
export const setDefaultAddress = async (userId, addressId, token) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/users/${userId}/addresses/${addressId}/default`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to set default address");
    }

    return await response.json();
  } catch (error) {
    console.error("Error setting default address:", error);
    throw error;
  }
};

// Lấy thông tin user (bao gồm danh sách địa chỉ)
export const getUserAddresses = async (userId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to get user addresses");
    }

    const user = await response.json();
    return user.addresses || [];
  } catch (error) {
    console.error("Error getting user addresses:", error);
    throw error;
  }
};
