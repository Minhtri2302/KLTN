export const getHomeTopNews = async () => {
  try {
    const { ok, data } = await safeFetchJson(`${API}/news/home-top`);
    if (!ok) return [];
    return (data && (data.data || data)) ? (data.data || data) : [];
  } catch (err) {
    console.error('Error fetching home top news:', err);
    return [];
  }
};
const API = "http://localhost:5000";

async function safeFetchJson(url, opts) {
  const res = await fetch(url, opts);
  let data = null;
  try { data = await res.json(); } catch (e) { return { ok: res.ok, data: null, status: res.status }; }
  return { ok: res.ok, data, status: res.status };
}

export const getNewsList = async (query) => {
  try {
    const params = query ? `?q=${encodeURIComponent(query)}` : "";
    const { ok, data } = await safeFetchJson(`${API}/news${params}`);
    if (!ok) return [];
    return (data && (data.data || data)) ? (data.data || data) : [];
  } catch (err) {
    console.error("Error fetching news list:", err);
    return [];
  }
};

export const getNewsById = async (id) => {
  try {
    const { ok, data } = await safeFetchJson(`${API}/news/${id}`);
    if (!ok) return null;
    return (data && (data.data || data)) ? (data.data || data) : null;
  } catch (err) {
    console.error("Error fetching news by id:", err);
    return null;
  }
};

export const getTopNews = async () => {
  try {
    const { ok, data } = await safeFetchJson(`${API}/news/top`);
    if (!ok) return [];
    return (data && (data.data || data)) ? (data.data || data) : [];
  } catch (err) {
    console.error('Error fetching top news:', err);
    return [];
  }
};

function authHeaders(token, extra = {}) {
  return { ...(extra || {}), Authorization: `Bearer ${token}` };
}

export async function listNews(token) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/news`, { headers: authHeaders(token) });
  const text = await res.text();
  if (!text) return [];
  try { const data = JSON.parse(text); return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []); } catch (err) { return []; }
}

export async function createNews(token, body) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/news/post`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify(body) });
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`); err.code = res.status; throw err; }
  return data;
}

export async function updateNews(token, id, body) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/news/${id}/update`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify(body) });
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`); err.code = res.status; throw err; }
  return data;
}

export async function deleteNews(token, id) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/news/${id}/delete`, { method: 'DELETE', headers: authHeaders(token) });
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`); err.code = res.status; throw err; }
  return data;
}
