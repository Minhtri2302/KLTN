import axios from 'axios';

const API_URL = 'http://localhost:5000/products';

// Lấy danh sách sản phẩm, có thể truyền params để lọc/search/pagination
export async function fetchProducts(params = {}) {
  try {
    const response = await axios.get(API_URL, { params });
    // Trả về mảng sản phẩm hoặc object tuỳ backend
    return response.data?.data || response.data || [];
  } catch (error) {
    console.error('Lỗi khi lấy danh sách sản phẩm:', error);
    throw error;
  }
}

// Ví dụ sử dụng:
// fetchProducts({ search: 'xe dap', page: 1, pageSize: 10 })
//   .then(products => console.log(products));
