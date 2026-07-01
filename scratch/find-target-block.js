const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/dashboard/finance/page.js');
const content = fs.readFileSync(filePath, 'utf8');

const startIndex = content.indexOf('{/* Debit Amount */}');
const endIndex = content.indexOf('</TableCell>', startIndex + 100);
const secondEndIndex = content.indexOf('</TableCell>', endIndex + 10);
const thirdEndIndex = content.indexOf('</TableCell>', secondEndIndex + 10);

if (startIndex !== -1 && thirdEndIndex !== -1) {
  const block = content.substring(startIndex, thirdEndIndex + '</TableCell>'.length);
  console.log('=== ACTUAL BLOCK IN FILE ===');
  console.log(JSON.stringify(block));
} else {
  console.log('Start index:', startIndex, 'Third end index:', thirdEndIndex);
}
