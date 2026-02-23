import fetch from 'node-fetch';

async function testDelete() {
  console.log('--- Testing Piece Deletion ---');
  try {
    // 1. Login to get token
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@acl.com', password: 'password123' })
    });
    const { token } = await loginRes.json();
    
    // 2. Create a test piece
    const createRes = await fetch('http://localhost:3000/api/pieces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        reference: 'DEL-TEST-01',
        designation: 'Piece to Delete',
        categorie: 'Autre',
        uniteMesure: 'UNITE',
        stockMinimum: 1,
        stockMaximum: 10
      })
    });
    const piece = await createRes.json();
    console.log(`Created piece ID: ${piece.id}`);

    // 3. Delete the piece
    const deleteRes = await fetch(`http://localhost:3000/api/pieces/${piece.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (deleteRes.ok) {
      console.log('✅ Delete piece successful (200 OK)');
    } else {
      console.log(`❌ Delete failed with status: ${deleteRes.status}`);
      console.log(await deleteRes.text());
    }

    // 4. Verify piece is inactive (soft deleted)
    const getRes = await fetch('http://localhost:3000/api/pieces/catalogue', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const allPieces = await getRes.json();
    const found = allPieces.find(p => p.id === piece.id);
    if (!found) {
      console.log('✅ Piece successfully hidden from catalogue (soft delete verified)');
    } else {
      console.log('❌ Piece still visible in catalogue!');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testDelete();
