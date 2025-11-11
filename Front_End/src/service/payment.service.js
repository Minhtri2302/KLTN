const API = 'http://localhost:5000';

function authHeaders(token, extra = {}) { return { ...(extra || {}), Authorization: `Bearer ${token}` }; }

export async function createCheckoutSession(token, payload) {
  if (!token) throw Object.assign(new Error('No token provided'), { code: 401 });
  // payload can be either an orderId string (backwards compat) or an object with items/shipping
  const body = typeof payload === 'string' ? { orderId: payload } : (payload || {});
  const res = await fetch(`${API}/payments/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`);
    err.code = res.status;
    throw err;
  }
  return data; // expected { id, url }
}

// kept for future: createPaymentIntent if backend supports PaymentIntents
// export async function createPaymentIntent(token, amount, currency = 'vnd') {
//   const res = await fetch(`${API}/payments/create-payment-intent`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
//     body: JSON.stringify({ amount, currency }),
//   });
//   let data = null; try { data = await res.json(); } catch (e) {}
//   if (!res.ok) {
//     const err = new Error((data && data.message) ? data.message : `Request failed ${res.status}`);
//     err.code = res.status;
//     throw err;
//   }
//   return data; // expected { clientSecret }
// }
