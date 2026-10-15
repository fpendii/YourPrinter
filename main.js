const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

let pdfjsPromise;
let canvasPromise;

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#f6f8fb',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.loadFile('index.html');
}

function storagePath(fileName) {
  return path.join(app.getPath('userData'), fileName);
}

async function readStore(fileName, fallback) {
  try {
    return JSON.parse(await fs.readFile(storagePath(fileName), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeStore(fileName, value) {
  await fs.writeFile(storagePath(fileName), JSON.stringify(value, null, 2), 'utf8');
  return value;
}

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsPromise;
}

async function loadCanvas() {
  if (!canvasPromise) {
    canvasPromise = import('@napi-rs/canvas');
  }
  return canvasPromise;
}

function pageContainsColor(pixelData) {
  const channelDifference = 14;
  const stride = Math.max(4, Math.floor(pixelData.length / 900000) * 4);

  for (let index = 0; index < pixelData.length; index += stride) {
    const red = pixelData[index];
    const green = pixelData[index + 1];
    const blue = pixelData[index + 2];
    const alpha = pixelData[index + 3];

    if (alpha > 24 && (Math.abs(red - green) > channelDifference || Math.abs(red - blue) > channelDifference || Math.abs(green - blue) > channelDifference)) {
      return true;
    }
  }
  return false;
}

async function inspectPdf(filePath, onProgress) {
  const bytes = new Uint8Array(await fs.readFile(filePath));
  const [pdfjs, canvas] = await Promise.all([loadPdfJs(), loadCanvas()]);
  const document = await pdfjs.getDocument({ data: bytes, disableWorker: true }).promise;
  let colorPages = 0;

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    if (typeof onProgress === 'function') {
      onProgress({ current: pageNumber, total: document.numPages });
    }
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 0.55 });
    const width = Math.max(1, Math.ceil(viewport.width));
    const height = Math.max(1, Math.ceil(viewport.height));
    const surface = canvas.createCanvas(width, height);
    const context = surface.getContext('2d', { alpha: false });

    await page.render({ canvasContext: context, viewport }).promise;
    if (pageContainsColor(context.getImageData(0, 0, width, height).data)) colorPages += 1;
    page.cleanup();
  }

  return {
    fileName: path.basename(filePath),
    totalPages: document.numPages,
    colorPages,
    bwPages: document.numPages - colorPages,
    classification: 'automatic'
  };
}

app.whenReady().then(() => {
  ipcMain.handle('file:select-pdf', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Pilih file PDF',
      properties: ['openFile'],
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('pdf:inspect', async (event, filePath) => {
    return inspectPdf(filePath, (progress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('pdf:progress', progress);
      }
    });
  });

  ipcMain.handle('settings:read', () => readStore('settings.json', {
    bwPrice: 500,
    colorPrice: 2000,
    paperSize: 'A4'
  }));
  ipcMain.handle('settings:write', (_event, settings) => writeStore('settings.json', settings));

  ipcMain.handle('transactions:read', () => readStore('transactions.json', []));
  ipcMain.handle('transactions:add', async (_event, transaction) => {
    const transactions = await readStore('transactions.json', []);
    transactions.unshift(transaction);
    await writeStore('transactions.json', transactions);
    return transaction;
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
