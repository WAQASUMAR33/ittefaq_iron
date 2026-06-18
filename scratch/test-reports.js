const API_BASE_URL = 'http://localhost:3000';

async function testReport(type) {
  const url = `${API_BASE_URL}/api/reports?type=${type}&startDate=2026-06-15&endDate=2026-06-15`;
  console.log(`📡 Fetching ${type} from ${url}...`);
  try {
    const res = await fetch(url);
    console.log(`Response status: ${res.status} ${res.statusText}`);
    const data = await res.json();
    if (res.ok) {
      console.log(`✅ Success! Received ${data.ledgerEntries?.length || 0} ledger entries.`);
      if (data.summary) {
        console.log(`Summary:`, JSON.stringify(data.summary, null, 2));
      }
    } else {
      console.error(`❌ Error:`, JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error(`❌ Failed to connect/fetch:`, err.message);
  }
}

async function run() {
  await testReport('cash-report');
  console.log('-------------------------------------------');
  await testReport('bank-report');
}

run();
