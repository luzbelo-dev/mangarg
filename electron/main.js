const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 600,
    title: 'Mi Manga Dinamita',
    icon: path.join(__dirname, '..', 'public', 'icons', 'icon-512x512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    backgroundColor: '#0f0f1a',
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'manga-tracker', 'browser', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
