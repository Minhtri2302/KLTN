const API =  'http://localhost:5000';

async function parseJsonSafe(res) {
  try { return await res.json(); } catch (e) { return null; }
}

function makeApiError(res, data) {
  const msg = (data && data.message) ? data.message : `Request failed with status ${res.status}`;
  const err = new Error(msg);
  err.code = res.status;
  return err;
}

export async function createReview(payload) {
  const token = sessionStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}/reviews`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw makeApiError(res, data);
  return data;
}

export async function getReviewsByProduct(productId) {
  const res = await fetch(`${API}/reviews/product/${productId}`);
  const data = await parseJsonSafe(res);
  if (!res.ok) throw makeApiError(res, data);
  return data.data || [];
}

export async function getReviewsSummary(productId) {
  const res = await fetch(`${API}/reviews/product/${productId}/summary`);
  const data = await parseJsonSafe(res);
  if (!res.ok) throw makeApiError(res, data);
  return data;
}

export async function canUserReviewProduct(productId) {
  const token = sessionStorage.getItem('token');
  if (!token) return { canReview: false, reason: 'Bạn cần đăng nhập để đánh giá' };
  const res = await fetch(`${API}/reviews/product/${productId}/can-review`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw makeApiError(res, data);
  return data;
}

// Admin / management APIs
export async function listReviews(token) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/reviews`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw makeApiError(res, data);
  return data && data.data ? data.data : [];
}

export async function deleteReviewAdmin(token, id) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/reviews/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw makeApiError(res, data);
  return data;
}

export async function updateReviewAdmin(token, id, body) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/reviews/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw makeApiError(res, data);
  return data;
}

export default { createReview, getReviewsByProduct, getReviewsSummary, canUserReviewProduct, listReviews, deleteReviewAdmin, updateReviewAdmin };
