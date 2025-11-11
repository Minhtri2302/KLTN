const API = 'http://localhost:5000';
function authHeaders(token, extra = {}) { return { ...(extra || {}), Authorization: `Bearer ${token}` }; }

export async function listOrders(token) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/orders`, { headers: authHeaders(token) });
  const text = await res.text(); if (!text) return [];
  try { const data = JSON.parse(text); return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []); } catch (e) { return []; }
}

export async function createOrder(token, body) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify(body) });
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    // Debug: log server error details to help track down 4xx/5xx reasons
    console.error('[order.service] createOrder failed', { status: res.status, body: data });
    const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`);
    err.code = res.status;
    throw err;
  }
  return data;
}

export async function updateOrder(token, id, body) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify(body) });
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`); err.code = res.status; throw err; }
  return data;
}

export async function deleteOrder(token, id) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  const res = await fetch(`${API}/orders/${id}`, { method: 'DELETE', headers: authHeaders(token) });
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) { const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`); err.code = res.status; throw err; }
  return data;
}

export async function getOrdersByUser(token, accountId) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  try {
    const res = await fetch(`${API}/orders/user/${encodeURIComponent(accountId)}`, { headers: authHeaders(token) });
    let data = null; try { data = await res.json(); } catch (e) { }
    if (!res.ok) {
      const err = new Error((data && data.message) ? data.message : `Request failed with status ${res.status}`);
      err.code = res.status;
      throw err;
    }
    return data && data.data ? data.data : [];
  } catch (err) {
    throw err;
  }
}

export async function cancelOrder(token, orderId) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  try {
    const res = await fetch(`${API}/orders/${encodeURIComponent(orderId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({ status: 'Đã hủy' })
    });
    let data = null; try { data = await res.json(); } catch (e) { }
    if (!res.ok) {
      const err = new Error((data && data.message) ? data.message : `Request failed with status ${res.status}`);
      err.code = res.status;
      throw err;
    }
    return data;
  } catch (err) {
    throw err;
  }
}
