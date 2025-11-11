const API = "http://localhost:5000";

function authHeaders(token, extra = {}) {
  return { ...(extra || {}), Authorization: `Bearer ${token}` };
}

async function parseJsonSafe(res) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch (e) { return null; }
}

export async function getAllBanners(page = 1, pageSize = 3) {
  try {
    const res = await fetch(`${API}/banners?page=${page}&pageSize=${pageSize}`);
    const data = await parseJsonSafe(res);
    // Backend trả về { banners: [], pagination: {} }
    if (data && Array.isArray(data.banners)) return data;
    // Fallback nếu API trả về mảng trực tiếp
    if (Array.isArray(data)) return { banners: data, pagination: {} };
    return { banners: [], pagination: {} };
  } catch (err) {
    console.error('Error fetching banners:', err);
    return { banners: [], pagination: {} };
  }
}

export async function listBanners(token) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  // Không truyền page và pageSize để lấy tất cả banner
  const res = await fetch(`${API}/banners`, { headers: authHeaders(token) });
  const data = await parseJsonSafe(res);
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`); err.code = res.status; throw err; }
  // Xử lý response mới từ backend
  if (data && Array.isArray(data.banners)) return data.banners;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

export async function createBanner(token, body) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/banners`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify(body) });
  const data = await parseJsonSafe(res);
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`); err.code = res.status; throw err; }
  return data;
}

export async function updateBanner(token, id, body) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/banners/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify(body) });
  const data = await parseJsonSafe(res);
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`); err.code = res.status; throw err; }
  return data;
}

export async function deleteBanner(token, id) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/banners/${id}`, { method: 'DELETE', headers: authHeaders(token) });
  const data = await parseJsonSafe(res);
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`); err.code = res.status; throw err; }
  return data;
}

const bannerService = { getAllBanners, listBanners, createBanner, updateBanner, deleteBanner };
export default bannerService;
