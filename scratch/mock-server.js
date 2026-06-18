const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// We need to bypass ESM imports since we are running standard CommonJS script.
// Next.js ESM dynamic import will compile it.
async function startServer() {
  const routeModule = await import('../src/app/api/purchases/route.js');
  
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Read body
    let bodyText = '';
    req.on('data', chunk => { bodyText += chunk; });
    req.on('end', async () => {
      let body = {};
      if (bodyText) {
        try {
          body = JSON.parse(bodyText);
        } catch (e) {}
      }

      // Mock NextRequest-like object
      const nextReq = {
        url: `http://localhost:3002${req.url}`,
        json: () => Promise.resolve(body)
      };

      try {
        let response;
        if (req.method === 'GET') {
          response = await routeModule.GET(nextReq);
        } else if (req.method === 'POST') {
          response = await routeModule.POST(nextReq);
        } else if (req.method === 'PUT') {
          response = await routeModule.PUT(nextReq);
        } else if (req.method === 'DELETE') {
          response = await routeModule.DELETE(nextReq);
        }

        if (response) {
          const status = response.status || 200;
          const data = await response.json();
          res.writeHead(status);
          res.end(JSON.stringify(data));
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Method not supported' }));
        }
      } catch (err) {
        console.error('❌ Server Error during route execution:', err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message, stack: err.stack }));
      }
    });
  });

  server.listen(3002, () => {
    console.log('🚀 Mock Server is listening on http://localhost:3002');
  });
}

startServer().catch(console.error);
