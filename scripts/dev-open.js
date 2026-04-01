const { spawn } = require('child_process');
const { platform } = require('os');

const SITE_URL = 'http://localhost:5173';
const children = new Map();

const isWindows = platform() === 'win32';

const openBrowser = () => {
  try {
    const currentPlatform = platform();

    if (currentPlatform === 'win32') {
      spawn('cmd', ['/c', 'start', '', SITE_URL], {
        detached: true,
        stdio: 'ignore',
      }).unref();
      return;
    }

    if (currentPlatform === 'darwin') {
      spawn('open', [SITE_URL], {
        detached: true,
        stdio: 'ignore',
      }).unref();
      return;
    }

    spawn('xdg-open', [SITE_URL], {
      detached: true,
      stdio: 'ignore',
    })
      .on('error', () => {
        console.log(`Browser auto-open not supported. Open manually: ${SITE_URL}`);
      })
      .unref();
  } catch {
    console.log(`Could not open browser. Open manually: ${SITE_URL}`);
  }
};

const stopChild = (child) => {
  if (!child || child.killed) {
    return;
  }

  try {
    child.kill();
  } catch {
    // ignore cleanup errors
  }
};

const terminateAll = () => {
  for (const child of children.values()) {
    stopChild(child);
  }
};

const run = (workspace, label) => {
  const command = isWindows ? 'cmd.exe' : 'npm';
  const args = isWindows
    ? ['/d', '/s', '/c', 'npm.cmd', 'run', 'dev', '-w', workspace]
    : ['run', 'dev', '-w', workspace];

  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
  });

  children.set(label, child);

  child.on('exit', (code, signal) => {
    const details = signal ? `terminated by ${signal}` : `exited with ${code}`;
    console.log(`${label} ${details}`);
    children.delete(label);

    if (code && code !== 0) {
      console.error(
        `${label} failed, but the other process is still running. Fix the error above and restart only the failed workspace if needed.`,
      );
    }

    if (children.size === 0) {
      process.exit(code ?? 0);
    }
  });

  child.on('error', (error) => {
    console.error(`${label} failed to start: ${error.message}`);
    children.delete(label);
    if (children.size === 0) {
      process.exit(1);
    }
  });

  return child;
};

process.on('SIGINT', () => {
  terminateAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  terminateAll();
  process.exit(0);
});

console.log('Starting Vi-Notes backend and frontend...');

setTimeout(openBrowser, 3000);

run('server', 'server');
run('client', 'client');
