const fs = require('fs');
const content = fs.readFileSync('src/app/api/purchases/route.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('detailsData')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
});
