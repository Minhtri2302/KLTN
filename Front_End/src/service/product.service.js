const API = "http://localhost:5000";

async function safeFetchJson(url, opts) {
  const res = await fetch(url, opts);
  let data = null;
  try { data = await res.json(); } catch (e) { return { ok: res.ok, data: null, status: res.status }; }
  return { ok: res.ok, data, status: res.status };
}

export const getProductsByCategory = async (categoryId) => {
  try {
    const { ok, data } = await safeFetchJson(`${API}/products/${categoryId}`);
    if (!ok) return [];
    // Backend trả về { products, total, page, pageSize, totalPages }
    return data?.products || [];
  } catch (err) {
    console.error("Error fetching products by category:", err);
    return [];
  }
};

export const getTop4ProductsByCategory = async (categoryId) => {
  try {
    const { ok, data } = await safeFetchJson(`${API}/products/${categoryId}/top4`);
    if (!ok) return [];
    return (data && (data.data || data)) ? (data.data || data) : [];
  } catch (err) {
    console.error("Error fetching top4 products by category:", err);
    return [];
  }
};

export const getProductsById = async (Id) => {
  try {
    const { ok, data } = await safeFetchJson(`${API}/products/${Id}/product`);
    if (!ok) return [];
    return (data && (data.data || data)) ? (data.data || data) : [];
  } catch (err) {
    console.error("Error fetching products by id:", err);
    return [];
  }
};

export const searchProducts = async (search, page = 1, pageSize = 8) => {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('page', page);
    params.append('pageSize', pageSize);
    
    const { ok, data } = await safeFetchJson(`${API}/products?${params.toString()}`);
    if (!ok) return { products: [], pagination: null };
    
    // Backend trả về { data: [...], pagination: {...} }
    return {
      products: data?.data || [],
      pagination: data?.pagination || null
    };
  } catch (err) {
    console.error("Error searching products:", err);
    return { products: [], pagination: null };
  }
};

function authHeaders(token, extra = {}) {
  return { ...(extra || {}), Authorization: `Bearer ${token}` };
}

export async function listProducts(token) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/products`, { headers: authHeaders(token) });
  const text = await res.text();
  if (!text) return [];
  try { 
    const data = JSON.parse(text); 
    // Backend có thể trả về {products: [...], total: ...} hoặc trực tiếp array
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.products)) return data.products;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  } catch (err) { 
    console.error('Error parsing products list:', err);
    return []; 
  }
}

export async function createProduct(token, body) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/products/post`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify(body) });
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`); err.code = res.status; throw err; }
  return data;
}

export async function updateProduct(token, id, body) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/products/${id}/update`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify(body) });
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`); err.code = res.status; throw err; }
  return data;
}

export async function deleteProduct(token, id) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/products/${id}/delete`, { method: 'DELETE', headers: authHeaders(token) });
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`); err.code = res.status; throw err; }
  return data;
}

