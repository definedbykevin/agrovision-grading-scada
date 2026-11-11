// PM2 owns this launcher; the Python CCTV worker never opens a Windows console.
const { spawn } = require('node:child_process');
const net = require('node:net');
const port = Number(process.env.PORT || 4101);
const python = process.env.SECURITY_AI_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
let worker;
let stopping = false;

function stop() {
  if (stopping) return;
  stopping = true;
  if (!worker) { process.exit(0); return; }
  worker.kill('SIGTERM');
  setTimeout(() => { worker.kill('SIGKILL'); }, 6000).unref();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
process.on('message', message => { if (message === 'shutdown') stop(); });

// Refuse to create duplicate readers if an orphan/other instance holds the port.
const probe = net.createServer();
probe.once('error', () => {
  console.error(`[CCTV] Port ${port} is already in use; no duplicate worker started.`);
  process.exit(1);
});
probe.listen(port, '0.0.0.0', () => probe.close(() => {
  if (stopping) return;
  worker = spawn(python, ['-u', 'app.py'], {
    cwd: __dirname, windowsHide: true, stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, PORT: String(port), PYTHONUNBUFFERED: '1' },
  });
  worker.once('error', error => {
    console.error('[CCTV] Python worker could not start:', error.code);
    process.exit(1);
  });
  worker.once('exit', code => process.exit(stopping ? 0 : code || 1));
}));
