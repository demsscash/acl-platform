async function testAll() {
  const baseUrl = 'http://localhost:3000/api';
  let token = '';

  const request = async (endpoint, method = 'GET', body = null) => {
    const options = {
      method,
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };
    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(`${baseUrl}${endpoint}`, options);
      const data = await res.json().catch(() => null);
      return { status: res.status, data };
    } catch (e) {
      return { status: 0, error: e.message };
    }
  };

  console.log('--- TEST LOGIC REPORT ---');

  // 1. Auth
  console.log('\n[1] Testing Auth...');
  const loginRes = await request('/auth/login', 'POST', { email: 'admin@acl.sn', password: 'admin123' });
  console.log(`Auth Login: ${loginRes.status === 200 || loginRes.status === 201 ? '✅ PASS' : '❌ FAIL ' + loginRes.status}`);
  if (loginRes.data && loginRes.data.accessToken) {
    token = loginRes.data.accessToken;
  } else {
    console.log('Stopping: Could not get token.');
    return;
  }

  // 2. Users
  console.log('\n[2] Testing Users...');
  const usersRes = await request('/users');
  console.log(`Get Users: ${usersRes.status === 200 ? '✅ PASS' : '❌ FAIL ' + usersRes.status}`);

  // 3. Camions
  console.log('\n[3] Testing Camions...');
  const camionsRes = await request('/camions');
  console.log(`Get Camions: ${camionsRes.status === 200 ? '✅ PASS' : '❌ FAIL ' + camionsRes.status}`);

  // 4. Chauffeurs
  console.log('\n[4] Testing Chauffeurs...');
  const chauffeursRes = await request('/chauffeurs');
  console.log(`Get Chauffeurs: ${chauffeursRes.status === 200 ? '✅ PASS' : '❌ FAIL ' + chauffeursRes.status}`);

  // 5. Pieces
  console.log('\n[5] Testing Pieces...');
  const piecesRes = await request('/pieces');
  console.log(`Get Pieces: ${piecesRes.status === 200 ? '✅ PASS' : '❌ FAIL ' + piecesRes.status}`);
  const entreesRes = await request('/pieces/entrees/all');
  console.log(`Get Entrees: ${entreesRes.status === 200 ? '✅ PASS' : '❌ FAIL ' + entreesRes.status}`);
  const sortiesRes = await request('/pieces/sorties/all');
  console.log(`Get Sorties: ${sortiesRes.status === 200 ? '✅ PASS' : '❌ FAIL ' + sortiesRes.status}`);
  const mouvRes = await request('/pieces/mouvements');
  console.log(`Get Mouvements: ${mouvRes.status === 200 ? '✅ PASS' : '❌ FAIL ' + mouvRes.status}`);

  // 6. Entretiens
  console.log('\n[6] Testing Entretiens...');
  const entretiensRes = await request('/entretien');
  console.log(`Get Entretiens: ${entretiensRes.status === 200 ? '✅ PASS' : '❌ FAIL ' + entretiensRes.status}`);

  // 7. Caisses
  console.log('\n[7] Testing Caisses...');
  const caissesRes = await request('/caisses');
  console.log(`Get Caisses: ${caissesRes.status === 200 ? '✅ PASS' : '❌ FAIL ' + caissesRes.status}`);
  const caissesStatsRes = await request('/caisses/stats');
  console.log(`Get Caisses Stats: ${caissesStatsRes.status === 200 ? '✅ PASS' : '❌ FAIL ' + caissesStatsRes.status}`);

  // 8. Clients
  console.log('\n[8] Testing Clients...');
  const clientsRes = await request('/clients');
  console.log(`Get Clients: ${clientsRes.status === 200 ? '✅ PASS' : '❌ FAIL ' + clientsRes.status}`);

  // 10. Export Stats
  console.log('\n[10] Testing Export Stats...');
  const exportRes = await request('/export/stats?dateDebut=2026-01-01&dateFin=2026-12-31');
  console.log(`Get Export Stats: ${exportRes.status === 200 ? '✅ PASS' : '❌ FAIL ' + exportRes.status}`);

  // 11. Configuration
  console.log('\n[11] Testing Config...');
  const configRes = await request('/config');
  console.log(`Get Config: ${configRes.status === 200 ? '✅ PASS' : '❌ FAIL ' + configRes.status}`);
}

testAll().catch(console.error);
