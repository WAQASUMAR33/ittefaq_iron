async function run() {
  console.log('--- Direct GET Route Execution ---');
  try {
    const { GET } = await import('../src/app/api/sales/route.js');
    const req = {
      url: 'http://localhost:3001/api/sales?id=195'
    };
    const res = await GET(req);
    console.log(`Response status: ${res.status}`);
    const data = await res.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Execution Error:', err);
  }
}

run();
