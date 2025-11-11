const API = 'http://localhost:5000';
export async function login(username, password) {
  const res = await fetch(`${API}/accounts/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function register(form) {
  const body = {
    username: form.username,
    password: form.password,
    name: form.fullname,
    phone: form.phone,
    email: form.email,
    role: form.role || "user",
  };
  
  const res = await fetch(`${API}/accounts/postaccount`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}
