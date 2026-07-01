const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        searchDir(fullPath);
      }
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('recalculateLedgerBalances') || content.includes('runningBalance')) {
        console.log(`Found in: ${fullPath}`);
        // print lines around the match
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('runningBalance') || line.includes('change =') || line.includes('closing =')) {
            console.log(`  Line ${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

searchDir('d:/new_ittefaq_iron/itefaq builders/itefaq builders/src');
