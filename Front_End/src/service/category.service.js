const API = 'http://localhost:5000';
function authHeaders(token, extra = {}) { return { ...(extra || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }; }

export const getAllCategory = async (token) => {
  try {
    const res = await fetch(`${API}/category`, { headers: authHeaders(token) });
    let data = null; try { data = await res.json(); } catch (e) { }
    if (!res.ok) {
      const err = new Error((data && data.message) ? data.message : `Request failed with status ${res.status}`);
      err.code = res.status;
      throw err;
    }
    return data && (data.data || data) ? (data.data || data) : [];
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

export async function listCategories(token) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/category`, { headers: authHeaders(token) });
  const text = await res.text(); if (!text) return [];
  try { const data = JSON.parse(text); return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []); } catch (e) { return []; }
}

export async function createCategory(token, body) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  let opts = { method: 'POST', headers: authHeaders(token) };
  // Nếu body là object và có image là File, chuyển sang FormData
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body && typeof body === 'object' && body.image instanceof File) {
    const formData = new FormData();
    Object.entries(body).forEach(([key, value]) => {
      formData.append(key, value);
    });
    opts.body = formData;
    // Xóa Content-Type để browser tự set multipart
    delete opts.headers['Content-Type'];
  } else {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${API}/category`, opts);
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`); err.code = res.status; throw err; }
  return data;
}

export async function updateCategory(token, id, body) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  let opts = { method: 'PUT', headers: authHeaders(token) };
  // Nếu body là object và có image là File, chuyển sang FormData
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body && typeof body === 'object' && body.image instanceof File) {
    const formData = new FormData();
    Object.entries(body).forEach(([key, value]) => {
      formData.append(key, value);
    });
    opts.body = formData;
    delete opts.headers['Content-Type'];
  } else {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${API}/category/${encodeURIComponent(id)}`, opts);
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`); err.code = res.status; throw err; }
  return data;
}

export async function deleteCategory(token, id) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/category/${encodeURIComponent(id)}`, { method: 'DELETE', headers: authHeaders(token) });
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`); err.code = res.status; throw err; }
  return data;
}
