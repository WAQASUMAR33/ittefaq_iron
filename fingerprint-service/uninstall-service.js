'use strict';
const { Service } = require('node-windows');
const path = require('path');

const svc = new Service({
  name:   'Itefaq Fingerprint Bridge',
  script: path.join(__dirname, 'server.js'),
});

svc.on('uninstall', () => console.log('✓ Service uninstalled.'));
svc.on('error', (err) => console.error('✗ Error:', err));

svc.uninstall();
