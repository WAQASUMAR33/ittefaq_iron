const fs = require('fs');
const path = require('path');

const filepath = 'd:/new_ittefaq_iron/itefaq builders/itefaq builders/src/app/dashboard/finance/page.js';
const content = fs.readFileSync(filepath, 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('displayAmts') || line.includes('getLedgerEntryDisplayAmounts') || line.includes('function getLedger') || line.includes('isRowCashBank')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
