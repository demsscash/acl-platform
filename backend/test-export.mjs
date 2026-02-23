async function test() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@acl.sn', password: 'admin123' })
  });
  const data = await loginRes.json();
  const token = data.accessToken;

  const statsRes = await fetch('http://localhost:3000/api/export/stats?dateDebut=2026-02-01&dateFin=2026-02-28', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Status:', statsRes.status);
  const text = await statsRes.text();
  console.log('Response:', text);
}
test();
