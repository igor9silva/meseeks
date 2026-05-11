import { app, BrowserWindow, protocol } from 'electron'
import { registerAIProtocol, registerLocalProtocol } from './protocol'
import { WindowController } from './window-controller'

let controller: WindowController | null = null

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
])

app.whenReady().then(() => {
  registerLocalProtocol()
  registerAIProtocol()
  controller = new WindowController()
  controller.createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    controller?.createWindow()
  }
})
