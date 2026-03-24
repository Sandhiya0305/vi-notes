/**
 * ELECTRON MAIN PROCESS
 * Handles window management and global keyboard event capture (when focused)
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';

let mainWindow: BrowserWindow | null = null;

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 950,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../assets/icon.png'),
  });

  const startUrl = isDev
    ? 'http://localhost:5173' // Vite dev server
    : `file://${path.join(__dirname, '../client/dist/index.html')}`; // Build output

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * App event handlers
 */
app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * IPC handlers for focus/blur events
 * The renderer will notify when the editor gets focus/loses focus
 */
ipcMain.on('editor-focus', () => {
  // Start listening to keyboard events
  // In production, you'd use a native keyboard hook library
  // For now, the keyboard listener is in the React component
});

ipcMain.on('editor-blur', () => {
  // Stop listening to keyboard events
});
