const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/app/dashboard/sales/page.js');
const content = fs.readFileSync(filePath, 'utf8');

// Split lines preserving carriage returns
const lines = content.replace(/\r\n/g, '\n').split('\n');

let replacedCount = 0;
const modifiedLines = lines.map((line, index) => {
  if (line.includes('.toFixed(2)')) {
    // Keep .toFixed(2) for unit rate fields
    if (line.includes('detail.unit_rate')) {
      return line;
    }
    const newLine = line.replace(/\.toFixed\(2\)/g, '.toFixed(0)');
    console.log(`Line ${index + 1}:`);
    console.log(`  - ${line.trim()}`);
    console.log(`  + ${newLine.trim()}`);
    replacedCount++;
    return newLine;
  }
  return line;
});

fs.writeFileSync(filePath, modifiedLines.join('\n'), 'utf8');
console.log(`Replaced ${replacedCount} instances of .toFixed(2) with .toFixed(0)`);
