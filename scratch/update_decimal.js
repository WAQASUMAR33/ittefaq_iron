const fs = require('fs');
const path = require('path');

const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
const content = fs.readFileSync(schemaPath, 'utf8');

// Normalize line endings to work with LF/CRLF and split
const lines = content.replace(/\r\n/g, '\n').split('\n');

let modifiedCount = 0;

const modifiedLines = lines.map((line, idx) => {
  const trimmed = line.trim();
  // Skip comments and empty lines
  if (trimmed.startsWith('//') || trimmed.startsWith('///') || trimmed === '') {
    return line;
  }

  // Regex to match: [indent][fieldName] [fieldType] [optional attributes...]
  // Examples:
  //   total_amount      Decimal
  //   discount          Decimal        @default(0.000000000000000000000000000000)
  //   transport_amount  Decimal?         @default(0.00) @db.Decimal(10, 2)
  const regex = /^(\s*)(\w+)\s+(Decimal\??)(?:\s+(.*))?$/;
  const match = line.match(regex);
  if (!match) {
    return line;
  }

  const indent = match[1];
  const fieldName = match[2];
  const fieldType = match[3];
  let attributes = match[4] ? match[4].trim() : '';

  let hasDbDecimal = attributes.includes('@db.Decimal');
  
  // Replace zero defaults like @default(0) or @default(0.000...0) with @default(0.00)
  if (attributes.includes('@default')) {
    attributes = attributes.replace(/@default\(\s*0+(?:\.0+)?\s*\)/g, '@default(0.00)');
  }

  // Append @db.Decimal(18, 2) if not already present
  if (!hasDbDecimal) {
    if (attributes) {
      attributes += ' @db.Decimal(18, 2)';
    } else {
      attributes = '@db.Decimal(18, 2)';
    }
  }

  // Format nicely matching the alignment style
  // Field name padded to 30 chars, type padded to 10 chars, then attributes
  const namePart = fieldName.padEnd(30, ' ');
  const typePart = fieldType.padEnd(10, ' ');
  const fieldPart = (namePart.length > fieldName.length ? namePart : fieldName + ' ') + typePart;
  const newLine = `${indent}${fieldPart}${attributes}`.trimEnd();

  if (line.trim() !== newLine.trim()) {
    console.log(`Line ${idx + 1}:`);
    console.log(`  - ${line.trim()}`);
    console.log(`  + ${newLine.trim()}`);
    modifiedCount++;
  }

  return newLine;
});

if (modifiedCount > 0) {
  fs.writeFileSync(schemaPath, modifiedLines.join('\n'), 'utf8');
  console.log(`\nSuccessfully modified ${modifiedCount} lines in schema.prisma.`);
} else {
  console.log('\nNo fields needed modification.');
}
