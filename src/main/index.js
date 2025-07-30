import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'


// 存储显示器信息
let displayInfo = {
  displays: [],
  primaryDisplay: null
};

// 更新显示器信息
function updateDisplayInfo() {
  const displays = screen.getAllDisplays();
  displayInfo = {
    displays,
    primaryDisplay: screen.getPrimaryDisplay()
  };
}


function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    menuBarVisible: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  // 方法1：创建时自动打开开发者工具
  mainWindow.webContents.openDevTools({
    mode: 'bottom' // 分离式窗口
  })

  // 初始获取显示器信息
  updateDisplayInfo();

  // 注册显示器变化事件
  screen.on('display-added', updateDisplayInfo);
  screen.on('display-removed', updateDisplayInfo);
  screen.on('display-metrics-changed', updateDisplayInfo);


  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }


}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 为渲染进程提供显示器信息的 IPC 接口
ipcMain.handle('get-display-info', async () => {
  updateDisplayInfo(); // 确保获取最新信息
  return displayInfo;
});

let danmuWindow = null;
// 为渲染进程提供显示器信息的 IPC 接口
ipcMain.handle('show-danmu-window', async (event, danmuSettings) => {
  const settings = JSON.parse(danmuSettings)
  if (danmuWindow == null) {
    danmuWindow = new BrowserWindow({
      width: settings.display.size.width,
      height: 800,
      x: 0,
      y: 0,
      show: false,
      autoHideMenuBar: true,
      menuBarVisible: false,
      frame: false,
      resizable: false,
      ...(process.platform === 'linux' ? { icon } : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    danmuWindow.on('ready-to-show', () => {
      danmuWindow.show()
    })
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      danmuWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/#/danmu')
    } else {
      danmuWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }

});