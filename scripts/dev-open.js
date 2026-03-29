const { spawn } = require('child_process');
const { platform } = require('os');

const SITE_URL = 'http://localhost:5173';
const children = [];

const openBrowser = () => {
  const plat = platform();
  if (plat === 'win32') {
    const opener = spawn('cmd', ['/c', 'start', '""', SITE_URL], { stdio: 'ignore', detached: true });
    opener.unref();
    return;
  }

  const opener = spawn(plat === 'darwin' ? 'open' : 'xdg-open', [SITE_URL], { stdio: 'ignore', detached: true });
  opener.unref();
};

const spawnWithLogging = ({ label, command, args }) => {
  const child = spawn(command, args, { stdio: 'inherit', shell: false });
  children.push(child);

  child.on('exit', (code, signal) => {
    console.log(`${label} ${signal ? `terminated by ${signal}` : `exited with ${code}`}`);
    if (signal || code !== 0) {
      terminateAll();
    }
  });
  child.on('error', (error) => {
    console.error(`${label} failed to start:`, error);
    terminateAll();
  });
};

const terminateAll = () => {
  children.forEach((child) => {
    if (!child.killed) {
      child.kill();
    }
  });
};

process.on('SIGINT', () => {
  terminateAll();
});

console.log('Starting Vi-Notes backend and frontend...');
openBrowser();
spawnWithLogging({ label: 'server', command: 'npm', args: ['run', 'dev', '-w', 'server'] });
spawnWithLogging({ label: 'client', command: 'npm', args: ['run', 'dev', '-w', 'client'] });
