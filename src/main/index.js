import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { th } from 'element-plus/lib/locale/index.js';


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


//定义全局变量存储主窗口 id

let mainWindowId = null;

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    menuBarVisible: false,
    backgroundColor: '#000000',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  // 方法1：创建时自动打开开发者工具
  // mainWindow.webContents.openDevTools({
  //   mode: 'bottom' // 分离式窗口
  // })
  // 存储主窗口 id
  mainWindowId = mainWindow.id;
  // 初始获取显示器信息
  updateDisplayInfo();

  // 注册显示器变化事件
  screen.on('display-added', updateDisplayInfo);
  screen.on('display-removed', updateDisplayInfo);
  screen.on('display-metrics-changed', updateDisplayInfo);


  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('close', () => {
    mainWindowId = null;
    app.quit()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })


  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }


}

app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')


  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {

    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})


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
function creatDanmuWindow(settings) {

  // 获取显示器信息
  const display = displayInfo.displays.find(d => d.id === settings.display)
  // 如果没有指定显示器，使用主显示器
  if (!display) {
    console.log("没有找到指定显示器，使用主显示器")
    display = displayInfo.primaryDisplay
  }
  if (danmuWindow !== null) {
    console.log("弹幕窗口已存在", danmuWindow)
    return;
  }
  // 判断是否为 macOS
  const is_mac = process.platform === "darwin";

  // 如果是 macOS，则隐藏 dock 图标
  if (is_mac) {
    app.dock.hide(); // - 1 -
  }
  // 创建弹幕窗口
  danmuWindow = new BrowserWindow({
    width: display.size.width,  //弹幕窗口宽度 = 显示器宽度
    height: display.size.height * settings.displayArea,  //弹幕窗口高度 = 显示器高度 * 显示区域
    x: display.bounds.x,  //弹幕窗口x坐标 = 显示器x坐标
    y: display.bounds.y,  //弹幕窗口y坐标 = 显示器y坐标
    show: false,
    autoHideMenuBar: true, // 自动隐藏菜单栏
    menuBarVisible: false, // 菜单栏不可见
    frame: false, // 无边框
    movable: false, // 不可移动
    focusable: false, // 不可聚焦
    alwaysOnTop: true, // alwaysOnTop
    transparent: true, // 透明
    backgroundColor: '#00000000', // 背景颜色
    resizable: false, // 不可调整大小
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  danmuWindow.setIgnoreMouseEvents(true);  // 忽略鼠标事件
  // 设置窗口始终在最前面
  danmuWindow.setAlwaysOnTop(true, "screen-saver"); // - 2 -
  // 设置窗口在所有工作区都可见
  danmuWindow.setVisibleOnAllWorkspaces(true); // - 3 -
  danmuWindow.on('ready-to-show', () => {
    danmuWindow.show()
  })
    danmuWindow.webContents.openDevTools({
    mode: 'detach' // 分离式窗口
  })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    danmuWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/#/danmu')
  } else {
    danmuWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.on('show-danmu-window', async (event, danmuSettings) => {
  if (danmuWindow === null) {
    const settings = JSON.parse(danmuSettings)
    creatDanmuWindow(settings)
  }
});

ipcMain.on('change-danmu-settings', (event, danmuSettings) => {
  const settings = JSON.parse(danmuSettings)
  // 获取显示器信息
  const display = displayInfo.displays.find(d => d.id === settings.display)
  // 如果没有指定显示器，使用主显示器
  if (!display) {
    console.log("没有找到指定显示器，使用主显示器")
    display = displayInfo.primaryDisplay
  }
  if (danmuWindow !== null) {
    danmuWindow.setSize(display.size.width, display.size.height * settings.displayArea);
    danmuWindow.setPosition(display.bounds.x, display.bounds.y);
    danmuWindow.webContents.send('change-danmu-settings', danmuSettings)
  }

})


ipcMain.handle('preview-danmu', async () => {
  if (danmuWindow == null) {
    return {
      type: "error",
      message: "弹幕窗口未创建"
    }
  }
  danmuWindow.webContents.send('preview-danmu')
  return {
    type: "success",
    message: "预览弹幕已发送"
  }
});

ipcMain.handle('connect-to-room', async (event, danmuInfo, roomId) => {
  console.log("connect-to-room", danmuWindow)
  if (danmuWindow == null) {
    throw new Error("弹幕窗口未创建")
  } else {
    danmuWindow.webContents.send('connect-to-room', danmuInfo, roomId)
    return {
      type: "success",
      message: "连接弹幕服务器成功"
    }
  }

});

ipcMain.on('disconnect-from-room', () => {
  if (danmuWindow !== null) {
    danmuWindow.webContents.send('disconnect-from-room')
  }
})

ipcMain.on('close-danmu-window', () => {
  if (danmuWindow !== null) {
    danmuWindow.close()
    danmuWindow = null
  }
})