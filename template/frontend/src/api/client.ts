export async function getHealth() {
  const base = import.meta.env.VITE_API_BASE || '/api';
  const res = await fetch(`${base}/health`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}