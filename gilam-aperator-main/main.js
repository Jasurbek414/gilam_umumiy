const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray;

app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
app.commandLine.appendSwitch('allow-insecure-localhost', 'true');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1150,
    height: 750,
    minWidth: 300,
    minHeight: 500,
    frame: false,
    transparent: false,
    resizable: true,
    show: true,  // darhol ko'rsatamiz
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    backgroundColor: '#0a0a1a',
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.session.setPermissionCheckHandler(() => true);
  mainWindow.webContents.session.setPermissionRequestHandler((_, __, cb) => cb(true));

  mainWindow.webContents.on('did-finish-load', async () => {
    try {
      const sipAccounts = await mainWindow.webContents.executeJavaScript("localStorage.getItem('sip_accounts')");
      const serverUrl = await mainWindow.webContents.executeJavaScript("localStorage.getItem('serverUrl')");
      const user = await mainWindow.webContents.executeJavaScript("localStorage.getItem('user')");
      const token = await mainWindow.webContents.executeJavaScript("localStorage.getItem('token')");
      
      const debugData = { sipAccounts, serverUrl, user, token };
      fs.writeFileSync(path.join(__dirname, '..', 'localstorage_debug.json'), JSON.stringify(debugData, null, 2));
    } catch (err) {
      fs.writeFileSync(path.join(__dirname, '..', 'localstorage_debug_error.txt'), err.message);
    }
  });

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Gilam Operator');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '📂 Ochish', click: () => mainWindow && mainWindow.show() },
    { type: 'separator' },
    { label: '❌ Chiqish', click: () => app.exit(0) },
  ]));
  tray.on('double-click', () => mainWindow && mainWindow.show());
}

app.whenReady().then(() => {
  createWindow();
  createTray();
});

ipcMain.on('window-minimize', () => mainWindow && mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow && mainWindow.hide());
ipcMain.on('window-quit', () => app.exit(0));
ipcMain.on('open-external', (_, url) => shell.openExternal(url));

// ── SIP Password Security ──
ipcMain.handle('encrypt-password', (_, password) => {
  try {
    if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
      return Buffer.from(password).toString('base64');
    }
    const encrypted = safeStorage.encryptString(password);
    return encrypted.toString('base64');
  } catch (err) {
    console.error('[safeStorage] Encryption failed, falling back to base64:', err);
    return Buffer.from(password).toString('base64');
  }
});

ipcMain.handle('decrypt-password', (_, encryptedB64) => {
  try {
    if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
      return Buffer.from(encryptedB64, 'base64').toString('utf-8');
    }
    const buffer = Buffer.from(encryptedB64, 'base64');
    return safeStorage.decryptString(buffer);
  } catch (err) {
    // If decryption fails, it might have been saved in plain base64 format (older profiles)
    try {
      return Buffer.from(encryptedB64, 'base64').toString('utf-8');
    } catch (fallbackErr) {
      return encryptedB64;
    }
  }
});


// ── Rasm tanlash (native dialog) ──
ipcMain.handle('pick-image', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Rasm tanlang',
    filters: [{ name: 'Rasmlar', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths.length) return null;
  try {
    const filePath = result.filePaths[0];
    const stat = fs.statSync(filePath);
    if (stat.size > 5 * 1024 * 1024) return { error: 'Rasm 5MB dan katta bo\'lmasin' };
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().replace('.', '') || 'jpeg';
    const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
    const base64 = `data:${mime};base64,${buffer.toString('base64')}`;
    return { base64 };
  } catch (e) {
    return { error: e.message };
  }
});

app.on('window-all-closed', () => {});
app.on('activate', () => {
  if (!mainWindow) createWindow();
  else mainWindow.show();
});
