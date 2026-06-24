const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/app/dashboard/sales/page.js');
const content = fs.readFileSync(filePath, 'utf8');

// Replace using specific variable targets
let updated = content;
updated = updated.replace(/fmtAmt\(detail\.qnty\)/g, 'fmtRateQty(detail.qnty)');
updated = updated.replace(/fmtAmt\(detail\.unit_rate\)/g, 'fmtRateQty(detail.unit_rate)');
updated = updated.replace(/fmtAmt\(d\.qnty\)/g, 'fmtRateQty(d.qnty)');
updated = updated.replace(/fmtAmt\(d\.unit_rate\)/g, 'fmtRateQty(d.unit_rate)');
updated = updated.replace(/fmtAmt\(option\.pro_crate\)/g, 'fmtRateQty(option.pro_crate)');

if (content !== updated) {
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Successfully replaced fmtAmt with fmtRateQty for target fields.');
} else {
  console.log('No matches found for fmtAmt targeting.');
}
