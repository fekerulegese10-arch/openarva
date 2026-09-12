const { app, BrowserWindow, Menu, Tray, shell } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');

let tray;
let gateway;
const port = Number(process.env.OPENARVA_PORT || 18789);

function createWindow() {
  const window = new BrowserWindow({ width: 1100, height: 760, show: false, webPreferences: { contextIsolation: true, sandbox: true } });
  window.loadURL(`http://127.0.0.1:${port}/dashboard`);
  window.on('close', (event) => {
    if (!app.isQuitting) { event.preventDefault(); window.hide(); }
  });
  return window;
}

app.whenReady().then(() => {
  gateway = spawn(process.execPath, [path.join(__dirname, '..', 'dist', 'index.js'), 'gateway', 'daemon', '--port', String(port)], { detached: true, stdio: 'ignore', windowsHide: true });
  gateway.unref();
  const window = createWindow();
  tray = new Tray(path.join(__dirname, '..', 'assets', 'openarva-logo.svg'));
  tray.setToolTip('OpenArva');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open OpenArva', click: () => { window.show(); } },
    { label: 'Open Dashboard', click: () => { void shell.openExternal(`http://127.0.0.1:${port}/dashboard`); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]));
  tray.on('click', () => window.show());
});

app.on('window-all-closed', (event) => event.preventDefault());
app.on('before-quit', () => { if (gateway?.pid) gateway.kill(); });