import { contextBridge,ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}

// 暴露获取显示器信息的方法
contextBridge.exposeInMainWorld('electronAPI', {
  getDisplayInfo: () => ipcRenderer.invoke('get-display-info'),
  openDanMuWindow: (settings) => ipcRenderer.send('show-danmu-window', settings),
  closeDanMuWindow: () => ipcRenderer.send('close-danmu-window'),
  changeDanmuSettings: (settings) => ipcRenderer.send('change-danmu-settings', settings),
  previewDanmu: () => ipcRenderer.invoke('preview-danmu'),
  connectToRoom: (danmuInfo,roomId) => ipcRenderer.invoke('connect-to-room', danmuInfo,roomId),
  disconnectFromRoom: () => ipcRenderer.send('disconnect-from-room'),
  updateDanmuList: (list) => ipcRenderer.send('update-danmu-list', list),
});