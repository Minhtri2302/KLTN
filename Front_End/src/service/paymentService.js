// // Frontend service to create a PaymentIntent on the backend
// // amount should be in the smallest currency unit (e.g., VND: 100000 for 100.000 VND)
// export async function createPaymentIntent(amount, currency = 'vnd') {
//   const res = await fetch('http://localhost:5000/payments/create-intent', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ amount, currency }),
//     credentials: 'include',
//   });

//   if (!res.ok) {
//     const text = await res.text();
//     throw new Error(`Create PaymentIntent failed: ${res.status} ${text}`);
//   }

//   return res.json(); // { clientSecret }
// }
