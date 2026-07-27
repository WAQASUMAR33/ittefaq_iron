const net = require('net');

function checkPort(ip, port, timeout = 300) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      status = true;
      socket.destroy();
    });

    socket.on('timeout', () => {
      socket.destroy();
    });

    socket.on('error', () => {
      socket.destroy();
    });

    socket.on('close', () => {
      resolve(status);
    });

    socket.connect(port, ip);
  });
}

async function main() {
  const subnet = '192.168.1.';
  const ports = [80, 443, 3000, 3306];
  
  console.log(`Scanning subnet ${subnet}* (26 to 150) for open ports ${ports.join(', ')}...`);

  // Scan in parallel batches of 25 to be fast
  const batchSize = 25;
  for (let start = 26; start <= 150; start += batchSize) {
    const promises = [];
    const end = Math.min(start + batchSize - 1, 150);
    
    for (let i = start; i <= end; i++) {
      const ip = `${subnet}${i}`;
      for (const port of ports) {
        promises.push(
          checkPort(ip, port).then(open => {
            if (open) {
              console.log(`  [+] ${ip}:${port} is OPEN`);
            }
          })
        );
      }
    }
    await Promise.all(promises);
  }
  console.log('Scan complete.');
}

main();
