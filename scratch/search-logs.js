const fs = require('fs');
const readline = require('readline');

async function main() {
  const logFile = "C:\\Users\\theit\\.gemini\\antigravity-ide\\brain\\67974b9f-5fb9-4b8b-891b-6c57067b7018\\.system_generated\\logs\\transcript_full.jsonl";
  
  console.log(`Scanning logs in ${logFile}...`);
  if (!fs.existsSync(logFile)) {
    console.log('Log file does not exist.');
    return;
  }

  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (line.includes('195.35.59.84')) {
      console.log(`\n--- Line ${lineCount} ---`);
      try {
        const obj = JSON.parse(line);
        console.log(`Created At: ${obj.created_at}`);
        console.log(`Type: ${obj.type}`);
        if (obj.tool_calls) {
          console.log(`Tool Calls: ${JSON.stringify(obj.tool_calls).substring(0, 500)}...`);
        } else {
          console.log(`Content: ${obj.content?.substring(0, 500)}...`);
        }
      } catch (e) {
        console.log(line.substring(0, 300) + '...');
      }
    }
  }
}

main();
