const electron = require('electron')
// Module to control application life.
const {app,ipcMain} = electron

// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
const {Menu, shell, dialog} = require('electron')

const path = require('path')
const url = require('url')
const {spawn, execFile} = require('child_process')
const {autoUpdater} = require('electron-updater');
const fs = require('fs');
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
const REPAIRING = true;

function createWindow() {
    // Create the browser window.
    // mainWindow = new BrowserWindow({width: REPAIRING ? 1280 : 920, height: REPAIRING ? 720 : 580, frame: false})
    mainWindow = new BrowserWindow({
        width: 1000, height: 600,  maxWidth: 1000,
        minWidth: 1000,
        maxHeight: 600,
        minHeight: 600,frame: false
    })
    // and load the index.html of the app.
    //本地调试删除注释  package start:firmware 加入 \"electron ./src/renderer-firmware/main.js\"
    if (process.env.NODE_ENV != 'development') {
      mainWindow.loadURL(url.format({
        pathname: path.resolve(__dirname, REPAIRING ? './newRepair.html' : './index.html'),
        protocol: 'file:',
        slashes: true
      }))
    } else {
        mainWindow.loadURL('http://localhost:9999/newRepair.html')
    }
    // createMenu()
    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })
	mainWindow.on('hide-window', () => {
		mainWindow.minimize();
	});
}
var driver_installing = false
const installDrive=(e,arg) => {
    if (driver_installing) {
        return
    }
    driver_installing = true
    const driverPath = path.resolve(__dirname, arg)
    console.log(driverPath,__dirname, arg)
    if (process.platform === 'darwin') {
        // create tmp file
        const tmp = path.join(app.getPath('temp'), 'mabot_driver.pkg');
		console.log(tmp)
        const stream = fs.createWriteStream(tmp);
        fs.createReadStream(driverPath).pipe(stream);
        stream.on('finish', () => {
            // it seems like `exec` has some issues, so we use `spawn`
            const installer = spawn('open', [tmp])
            installer.on('close', (code) => {
                console.log(`child process exited with code ${code}`)
                driver_installing = false
            });
        });
    } else {
        execFile(driverPath, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`)
            }
            driver_installing = false
        })
    }
}

// let t=require('./utils/mainLang')
// let langPath=path.resolve(__dirname, t)
// const strings= require(langPath)
// 
// let currLang=strings.ch   //current language ,default is ch
/* function createMenu() {
    let template = [{
        label: 'Mabot',
        // role: 'window',
        submenu: [{
            label: ' 开发模式',
            accelerator: (() => {
                if (process.platform === 'darwin') {
                    return 'Alt+Command+I'
                } else {
                    return 'Ctrl+Shift+I'
                }
            })(),
            click: (item, focusedWindow) => {
                if (focusedWindow) {
                    focusedWindow.toggleDevTools()
                }
            }
        },{
            label: '最小化',
            accelerator: 'CmdOrCtrl+M',
            role: 'minimize'
        }, {
            label: '刷新',
            accelerator: 'CmdOrCtrl+R',
            click: (item, focusedWindow) => {
                if (focusedWindow) {
                    // on reload, start fresh and close any old
                    // open secondary windows
                    if (focusedWindow.id === 1) {
                        BrowserWindow.getAllWindows().forEach(win => {
                            if (win.id > 1) win.close()
                        })
                    }
                    focusedWindow.reload()
                }
            }
        },{
            label: '关闭',
            accelerator: 'CmdOrCtrl+W',
            role: 'close'
        }]
    }, {
        label: currLang.lang,
        submenu: [{
            label: currLang.chinese,
            accelerator: 'CmdOrCtrl+1',
            click:()=>{
                mainWindow.webContents.send('ChangeCh');
                currLang=strings.ch
                createMenu()
            }
        }, {
            label: currLang.english,
            accelerator: 'CmdOrCtrl+2',
            click:()=>{
                mainWindow.webContents.send('ChangeEn');
                currLang=strings.en
                createMenu()
            }
        }]
    }, {
        label: currLang.help,
        submenu: [{
            label: currLang.install,
            accelerator: 'CmdOrCtrl+3',
            click: (item, focusedWindow) => {
                let driverPath;
                if (process.platform === 'win32') {
                    driverPath = './assets/driver/CH34x_Install_Windows_v3_4.EXE'
                } else if (process.platform === 'darwin') {
                    driverPath = './assets/driver/CH34x_Install_V1.4.pkg'
                } else {
                    dialog.showErrorBox("Error", 'unsupported platform')
                }
                installDrive(null,driverPath)
            }
        }, {
            label: currLang.customer,
            accelerator: 'CmdOrCtrl+4',
            click: (item, focusedWindow) => {
                const options = {
                    type: 'info',
                    title: '客服联系方式',
                    buttons: ['Ok'],
                    message: '电话：11111\n dizhi:22222'
                }
                dialog.showMessageBox(focusedWindow, options, function () { })
            }
        }]
    }]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
}


 */

ipcMain.on('closed', () => {
    app.quit();
});
//小化
ipcMain.on('hide-window', () => {
    mainWindow.minimize();
});
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    createWindow()
    // createMenu()
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.


electron.ipcMain.on('install-driver',installDrive );

var app_updating = false;
electron.ipcMain.on('update-app', (event, arg) => {
    if (app_updating) return;
    app_updating = true;

    function sendStatusToWindow(args) {
        if (mainWindow) {
            mainWindow.webContents.send('update-app', args);
        }
    };

    autoUpdater.on('checking-for-update', () => {
        sendStatusToWindow({
            status: 'started'
        });
    });
    autoUpdater.on('update-available', (e, info) => {
        sendStatusToWindow({
            status: 'update-available',
            info: info
        });
    });
    autoUpdater.on('update-not-available', (e, info) => {
        sendStatusToWindow({
            status: 'update-not-available',
            info: info
        });
    });
    autoUpdater.on('error', (e, err) => {
        sendStatusToWindow({
            status: 'error',
            err: err
        });
    });
    autoUpdater.on('download-progress', (progressObj) => {
        sendStatusToWindow({
            status: 'download-progress',
            percent: progressObj.percent
        });
    });
    autoUpdater.on('update-downloaded', (e, info) => {
        autoUpdater.quitAndInstall();
    });
    autoUpdater.checkForUpdates();
});
