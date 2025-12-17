const API = 'http://localhost:5000';

export async function getOverallStatistics(token) {
  const res = await fetch(`${API}/statistics/overall`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch overall statistics');
  return res.json();
}

export async function getMonthlyStatistics(token, year) {
  const url = year 
    ? `${API}/statistics/monthly?year=${year}` 
    : `${API}/statistics/monthly`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch monthly statistics');
  return res.json();
}

export default { getOverallStatistics, getMonthlyStatistics };
