'use strict';
/**
 * Installs the fingerprint bridge as a Windows service.
 * The service auto-starts with Windows — no need to run start.bat manually.
 *
 * Run ONCE as Administrator:
 *   node install-service.js
 */

const { Service } = require('node-windows');
const path = require('path');

const svc = new Service({
  name:        'Itefaq Fingerprint Bridge',
  description: 'Local WebSocket bridge (ws://localhost:15896) for the fingerprint reader.',
  script:      path.join(__dirname, 'server.js'),
  nodeOptions: [],
  wait: 2,
  grow: 0.5,
});

svc.on('install', () => {
  console.log('✓ Service installed. Starting...');
  svc.start();
});

svc.on('start', () => {
  console.log('✓ Service started successfully.');
  console.log('  It will now auto-start every time Windows boots.');
  console.log('  To uninstall: node uninstall-service.js');
});

svc.on('error', (err) => {
  console.error('✗ Service error:', err);
});

svc.on('alreadyinstalled', () => {
  console.log('ℹ Service is already installed. Starting it...');
  svc.start();
});

console.log('Installing fingerprint bridge as Windows service...');
svc.install();
