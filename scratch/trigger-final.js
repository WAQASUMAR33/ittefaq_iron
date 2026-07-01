const https = require('https');

https.get('https://ittefaq-iron.vercel.app/api/recalculate', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('=== Recalculation API Response ===');
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.error('Failed to parse response:', data);
    }
  });
}).on('error', (err) => {
  console.error('HTTP Error:', err.message);
});
