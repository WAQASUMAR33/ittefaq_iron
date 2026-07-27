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
  const ports = [80, 443, 3000];
  
  console.log(`Scanning subnet ${subnet}* (151 to 254) for open ports ${ports.join(', ')}...`);

  const batchSize = 25;
  for (let start = 151; start <= 254; start += batchSize) {
    const promises = [];
    const end = Math.min(start + batchSize - 1, 254);
    
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
