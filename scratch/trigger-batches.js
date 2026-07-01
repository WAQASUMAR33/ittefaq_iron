const https = require('https');

function fetchBatch(offset) {
  return new Promise((resolve, reject) => {
    const url = `https://ittefaq-iron.vercel.app/api/recalculate?offset=${offset}&limit=15`;
    console.log(`Sending request: ${url}`);
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data.substring(0, 100)}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  console.log('=== STARTING BATCH RECALCULATION TRIGGER ===');
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    try {
      const response = await fetchBatch(offset);
      console.log('Response status:', response.success ? 'SUCCESS' : 'FAILED');
      if (response.logs) {
        response.logs.forEach(log => console.log(`  ${log}`));
      }
      
      if (!response.success) {
        console.error('Error returned from API:', response.error);
        break;
      }
      
      hasMore = response.hasMore;
      offset = response.nextOffset;
      console.log(`Next offset: ${offset}, Has more: ${hasMore}\n`);
      
      // Wait 1 second between batches
      await new Promise(r => setTimeout(r, 1000));
    } catch (error) {
      console.error('Error fetching batch:', error.message);
      console.log('Retrying in 5 seconds...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  
  console.log('=== BATCH RECALCULATION COMPLETED ===');
}

run();
