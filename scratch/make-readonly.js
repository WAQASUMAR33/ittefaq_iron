const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/dashboard/finance/page.js');
let content = fs.readFileSync(filePath, 'utf8');

// We will find the unique block starting from debit amount cell down to balance cell
const target = `                             {/* Debit Amount */}
                             <TableCell
                               sx={{
                                 borderRight: 1,
                                 borderColor: 'divider',
                                 textAlign: 'right',
                                 bgcolor: rowBgColor,
                                 fontWeight: 700,
                                 cursor: 'pointer',
                                 position: 'relative'
                               }}
                               onClick={(e) => {
                                 e.stopPropagation();
                                 if (inlineEditing?.l_id === entry.l_id && inlineEditing?.field === 'debit') return;
                                 setInlineEditing({
                                   l_id: entry.l_id,
                                   field: 'debit',
                                   value: (entry.debit_amount || 0).toString()
                                 });
                               }}
                             >
                               {inlineEditing?.l_id === entry.l_id && inlineEditing?.field === 'debit' ? (
                                 <input
                                   type="number"
                                   defaultValue={inlineEditing.value}
                                   autoFocus
                                   onBlur={(e) => handleInlineSave(entry, 'debit', e.target.value)}
                                   onKeyDown={(e) => {
                                     if (e.key === 'Enter') {
                                       handleInlineSave(entry, 'debit', e.target.value);
                                     } else if (e.key === 'Escape') {
                                        setInlineEditing(null);
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onDoubleClick={(e) => e.stopPropagation()}
                                    style={{
                                      width: '90px',
                                      textAlign: 'right',
                                      padding: '2px 4px',
                                      border: \`1px solid \${debitColor}\`,
                                      borderRadius: '4px',
                                      fontWeight: 700,
                                      fontFamily: 'monospace',
                                      outline: 'none'
                                    }}
                                  />
                                ) : displayAmts.debit > 0 ? (
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
                                 cursor: 'pointer',
                                 position: 'relative'
                               }}
                               onClick={(e) => {
                                 e.stopPropagation();
                                 if (inlineEditing?.l_id === entry.l_id && inlineEditing?.field === 'credit') return;
                                 setInlineEditing({
                                   l_id: entry.l_id,
                                   field: 'credit',
                                   value: (entry.credit_amount || 0).toString()
                                 });
                               }}
                             >
                               {inlineEditing?.l_id === entry.l_id && inlineEditing?.field === 'credit' ? (
                                 <input
                                   type="number"
                                   defaultValue={inlineEditing.value}
                                   autoFocus
                                   onBlur={(e) => handleInlineSave(entry, 'credit', e.target.value)}
                                   onKeyDown={(e) => {
                                     if (e.key === 'Enter') {
                                       handleInlineSave(entry, 'credit', e.target.value);
                                     } else if (e.key === 'Escape') {
                                       setInlineEditing(null);
                                     }
                                   }}
                                   onClick={(e) => e.stopPropagation()}
                                   onDoubleClick={(e) => e.stopPropagation()}
                                   style={{
                                     width: '90px',
                                     textAlign: 'right',
                                     padding: '2px 4px',
                                     border: \`1px solid \${creditColor}\`,
                                     borderRadius: '4px',
                                     fontWeight: 700,
                                     fontFamily: 'monospace',
                                     outline: 'none'
                                   }}
                                 />
                               ) : displayAmts.credit > 0 ? (
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
                                 cursor: 'pointer',
                                 position: 'relative'
                               }}
                               onClick={(e) => {
                                 e.stopPropagation();
                                 if (inlineEditing?.l_id === entry.l_id && inlineEditing?.field === 'balance') return;
                                 setInlineEditing({
                                   l_id: entry.l_id,
                                   field: 'balance',
                                   value: (entry.closing_balance || 0).toString()
                                 });
                               }}
                             >
                               {inlineEditing?.l_id === entry.l_id && inlineEditing?.field === 'balance' ? (
                                 <input
                                   type="number"
                                   defaultValue={inlineEditing.value}
                                   autoFocus
                                   onBlur={(e) => handleInlineSave(entry, 'balance', e.target.value)}
                                   onKeyDown={(e) => {
                                     if (e.key === 'Enter') {
                                       handleInlineSave(entry, 'balance', e.target.value);
                                     } else if (e.key === 'Escape') {
                                       setInlineEditing(null);
                                     }
                                   }}
                                   onClick={(e) => e.stopPropagation()}
                                   onDoubleClick={(e) => e.stopPropagation()}
                                   style={{
                                     width: '100px',
                                     textAlign: 'right',
                                     padding: '2px 4px',
                                     border: '1px solid #1d4ed8',
                                     borderRadius: '4px',
                                     fontWeight: 700,
                                     fontFamily: 'monospace',
                                     outline: 'none'
                                   }}
                                 />
                               ) : (
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
                               )}
                             </TableCell>`;

const replacement = `                             {/* Debit Amount */}
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

// Clean whitespace normalization to prevent line-ending differences matching issues
function normalizeWhitespace(str) {
  return str.replace(/\r\n/g, '\n').trim();
}

const normContent = normalizeWhitespace(content);
const normTarget = normalizeWhitespace(target);

if (normContent.includes(normTarget)) {
  // Let's do search and replace by adjusting for CRLF
  const targetLines = target.replace(/\r\n/g, '\n');
  const replacementLines = replacement.replace(/\r\n/g, '\n');
  content = content.replace(/\r\n/g, '\n');
  content = content.replace(targetLines, replacementLines);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Successfully replaced inline editing with read-only cells.');
} else {
  console.error('❌ Target block not found in page.js');
}
