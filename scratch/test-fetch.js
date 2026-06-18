async function run() {
  const ports = [3000, 3001, 3005];
  for (const port of ports) {
    try {
      console.log(`Probing port ${port}...`);
      const res = await fetch(`http://localhost:${port}/api/sales?id=195`);
      console.log(`  Port ${port} responded: status=${res.status} ${res.statusText}`);
    } catch (e) {
      console.log(`  Port ${port} error: ${e.message}`);
    }
  }
}

run();
