const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const content = fs.readFileSync(schemaPath, 'utf8');
const lines = content.split('\n');

const modifiedLines = lines.map((line, idx) => {
  // Ignore comments or lines that don't have Decimal
  if (line.trim().startsWith('//') || line.trim().startsWith('///') || !line.includes('Decimal')) {
    return line;
  }

  // Match model fields: fieldName type [attributes...]
  // Examples:
  //   pro_cost_price          Decimal
  //   discount          Decimal        @default(0.000000000000000000000000000000)
  //   pro_crate               Decimal?               @default(0.00) @db.Decimal(10, 2)
  const regex = /^(\s*\w+\s+Decimal\??)(\s+.*)?$/;
  const match = line.match(regex);
  if (!match) {
    return line;
  }

  let fieldAndType = match[1];
  let attributes = (match[2] || '').trim();

  // If attributes already contain @db.Decimal, we don't need to add it, but we should clean up default if needed
  let hasDbDecimal = attributes.includes('@db.Decimal');
  
  // Clean up any default(0.00000...) or default(0) to default(0.00)
  if (attributes.includes('@default(')) {
    // Replace default(0.000...) or default(0) with default(0.00)
    attributes = attributes.replace(/@default\(\s*0(?:\.0+)?\s*\)/g, '@default(0.00)');
  } else if (!hasDbDecimal) {
    // If no default and no @db.Decimal, check if it has other attributes
    // If it has attributes, we can append @db.Decimal(18, 2)
  }

  if (!hasDbDecimal) {
    // Append @db.Decimal(18, 2)
    if (attributes) {
      attributes += ' @db.Decimal(18, 2)';
    } else {
      attributes = '@db.Decimal(18, 2)';
    }
  }

  // Reconstruct line preserving indentation
  const indent = line.match(/^\s*/)[0];
  const fieldNameAndType = fieldAndType.trim();
  // Pad the field name and type to look neat (e.g. 24 characters width)
  const paddedField = fieldNameAndType.padEnd(24, ' ');
  const newLine = `${indent}${paddedField} ${attributes}`.trimEnd();

  console.log(`Line ${idx + 1}:`);
  console.log(`- ${line}`);
  console.log(`+ ${newLine}`);
  return newLine;
});

// Output summary
console.log('Modified schema fields processed.');
fs.writeFileSync(schemaPath, modifiedLines.join('\n'), 'utf8');
console.log('schema.prisma updated successfully.');
