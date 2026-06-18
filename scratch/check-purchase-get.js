async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/purchases');
    console.log('GET Status:', res.status, res.statusText);
    const data = await res.json();
    console.log('GET Data sample:', JSON.stringify(data, null, 2).substring(0, 1000));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}
run();
