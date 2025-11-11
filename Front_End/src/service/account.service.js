const API = 'http://localhost:5000';

function authHeaders(token, extra = {}) { return { ...(extra || {}), Authorization: `Bearer ${token}` }; }

async function parseJsonSafe(res) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch (e) { return null; }
}

export async function changePassword(token, accountId, oldPassword, newPassword) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const url = `${API}/accounts/${accountId}/change-password`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const err = new Error((data && data.message) ? data.message : `Request failed with status ${res.status}`);
    err.code = res.status;
    throw err;
  }
  return data;
}

export async function getUserById(token, accountId) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/accounts/${accountId}`, { method: 'GET', headers: authHeaders(token) });
  const data = await parseJsonSafe(res);
  if (res.status === 401) { const err = new Error((data && data.message) ? data.message : 'Unauthorized'); err.code = 401; throw err; }
  if (res.status === 403) { const err = new Error((data && data.message) ? data.message : 'Forbidden'); err.code = 403; throw err; }
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed with status ${res.status}`); err.code = res.status; throw err; }
  return data && data.data ? data.data : data;
}

export async function listAccounts(token) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/accounts`, { headers: authHeaders(token) });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`);
    err.code = res.status;
    throw err;
  }
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

export async function createAccount(token, body) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/accounts/postaccount`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify(body) });
  const data = await parseJsonSafe(res);
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`); err.code = res.status; throw err; }
  return data;
}

export async function updateAccount(token, id, body) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/accounts/${id}/putaccount`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify(body) });
  const data = await parseJsonSafe(res);
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`); err.code = res.status; throw err; }
  return data;
}

export async function deleteAccount(token, id) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/accounts/${id}/deleteaccount`, { method: 'DELETE', headers: authHeaders(token) });
  const data = await parseJsonSafe(res);
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`); err.code = res.status; throw err; }
  return data;
}

const accountService = { changePassword, getUserById, listAccounts, createAccount, updateAccount, deleteAccount };
export default accountService;
