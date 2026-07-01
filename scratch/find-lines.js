const fs = require('fs');
const path = require('path');

const filepath = 'd:/new_ittefaq_iron/itefaq builders/itefaq builders/src/app/dashboard/sales/page.js';
const lines = fs.readFileSync(filepath, 'utf8').split('\n');

lines.forEach((line, idx) => {
  if (line.includes('selectedCustomerTypeFilter')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
