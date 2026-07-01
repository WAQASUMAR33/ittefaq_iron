const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/dashboard/finance/page.js');
let content = fs.readFileSync(filePath, 'utf8');

const startIndex = content.indexOf('{/* Debit Amount */}');
if (startIndex === -1) {
  console.error('Start comment not found');
  process.exit(1);
}

// Find 3rd </TableCell> after startIndex
let currentPos = startIndex;
for (let i = 0; i < 3; i++) {
  const nextCellEnd = content.indexOf('</TableCell>', currentPos);
  if (nextCellEnd === -1) {
    console.error('Could not find TableCell end number', i + 1);
    process.exit(1);
  }
  currentPos = nextCellEnd + '</TableCell>'.length;
}

const replacement = `{/* Debit Amount */}
                             <TableCell
                               sx={{
                                 borderRight: 1,
                                 borderColor: 'divider',
                                 textAlign: 'right',
                                 bgcolor: rowBgColor,
                                 fontWeight: 700,
                                 position: 'relative'
                               }}
                             >
                               {displayAmts.debit > 0 ? (
                                 <Typography
                                   variant="body2"
                                   sx={{
                                     fontWeight: 700,
                                     color: debitColor,
                                     fontFamily: 'monospace',
                                     fontSize: '0.95rem'
                                   }}
                                 >
                                   {fmtAmt(displayAmts.debit)}
                                 </Typography>
                               ) : (
                                 <Typography variant="body2" sx={{ color: '#d1d5db', fontWeight: 500 }}>
                                   -
                                 </Typography>
                               )}
                             </TableCell>

                             {/* Credit Amount */}
                             <TableCell
                               sx={{
                                 borderRight: 1,
                                 borderColor: 'divider',
                                 textAlign: 'right',
                                 bgcolor: rowBgColor,
                                 fontWeight: 700,
                                 position: 'relative'
                               }}
                             >
                               {displayAmts.credit > 0 ? (
                                 <Typography
                                   variant="body2"
                                   sx={{
                                     fontWeight: 700,
                                     color: creditColor,
                                     fontFamily: 'monospace',
                                     fontSize: '0.95rem'
                                   }}
                                 >
                                   {fmtAmt(displayAmts.credit)}
                                 </Typography>
                               ) : (
                                 <Typography variant="body2" sx={{ color: '#d1d5db', fontWeight: 500 }}>
                                   -
                                 </Typography>
                               )}
                             </TableCell>

                             {/* Running Balance */}
                             <TableCell
                               sx={{
                                 textAlign: 'right',
                                 bgcolor: rowBgColor,
                                 position: 'relative'
                               }}
                             >
                               <Typography
                                 variant="body2"
                                 sx={{
                                   fontWeight: 700,
                                   fontFamily: 'monospace',
                                   color: '#1d4ed8',
                                   bgcolor: '#eff6ff',
                                   px: 1,
                                   py: 0.5,
                                   borderRadius: 1,
                                   fontSize: '0.95rem',
                                   display: 'inline-block'
                                 }}
                               >
                                 {fmtAmt(entry.closing_balance)}
                               </Typography>
                             </TableCell>`;

content = content.substring(0, startIndex) + replacement + content.substring(currentPos);
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Successfully made Debit, Credit, and Balance columns read-only!');
