const { spawn } = require('child_process');
const path = require('path');

console.log('====================================================');
console.log('🚀 Starting TaskPilot AI (Backend + Frontend)...');
console.log('====================================================\n');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// 1. Spawn Backend
const backend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, '..', 'backend'),
  stdio: 'inherit',
  shell: true,
});

// 2. Spawn Frontend
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, '..', 'frontend'),
  stdio: 'inherit',
  shell: true,
});

function shutdown() {
  console.log('\n🛑 Shutting down TaskPilot AI servers...');
  if (isWindows) {
    if (backend.pid) spawn('taskkill', ['/pid', backend.pid.toString(), '/f', '/t']);
    if (frontend.pid) spawn('taskkill', ['/pid', frontend.pid.toString(), '/f', '/t']);
  } else {
    backend.kill('SIGINT');
    frontend.kill('SIGINT');
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

backend.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`[Backend] Process exited with code ${code}`);
  }
});

frontend.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`[Frontend] Process exited with code ${code}`);
  }
});
