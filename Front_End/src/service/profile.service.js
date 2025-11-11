const API = 'http://localhost:5000';

async function parseJsonSafe(res) {
  try { return await res.json(); } catch (e) { return null; }
}

function makeApiError(res, data) {
  const msg = (data && data.message) ? data.message : `Request failed with status ${res.status}`;
  const err = new Error(msg);
  err.code = res.status;
  return err;
}

export async function getProfileByAccountId(token, accountId) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  // Backend exposes GET /users/:id (see server routes). Try that first.
  const res = await fetch(`${API}/users/${accountId}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw makeApiError(res, data);
  return data && data.data ? data.data : data;
}

export async function getProfileById(token, id) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw makeApiError(res, data);
  return data && data.data ? data.data : data;
}

export async function createProfile(token, body) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw makeApiError(res, data);
  return data && data.data ? data.data : data;
}

export async function updateProfile(token, id, body) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw makeApiError(res, data);
  return data && data.data ? data.data : data;
}

export async function uploadImage(token, file) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API}/uploads/image`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw makeApiError(res, data);
  return data;
}

export default {
  getProfileByAccountId,
  getProfileById,
  createProfile,
  updateProfile,
  uploadImage,
};

// admin-style list & delete
export async function listProfiles(token) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text(); if (!text) return [];
  try { const data = JSON.parse(text); return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []); } catch (e) { return []; }
}

export async function deleteProfile(token, id) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`); err.code = res.status; throw err; }
  return data;
}

