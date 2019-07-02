const Sp = require('../../src/serialport/sp.js')
const req = require('../../src/serialport/plugin/cmd.js').req
const path = require('path')

const BrowserWindow = require('electron').remote.BrowserWindow
const app = require('electron').remote.app

const sp = new Sp()

const BINS = {
  MC_FIRMWARE_1026: path.resolve($dirname, require('../../src/renderer-firmware/assets/firmware/AppFirmware-final4.2.bin')),
  MC_FIRMWARE_1027: path.resolve($dirname, require('../../src/renderer-firmware/assets/firmware/AppFirmware-final4.3.bin')),
  MC_FIRMWARE_1286: path.resolve($dirname, require('../../src/renderer-firmware/assets/firmware/AppFirmware_encrypted_v0506.bin')),
  COLOR_FIRMWARE: path.resolve($dirname, require('../../src/renderer-firmware/assets/firmware/color_v0501.bin')),
  HSERVO_FIRMWARE: path.resolve($dirname, require('../../src/renderer-firmware/assets/firmware/hservo-v0501.bin')),
  IR_FIRMWARE: path.resolve($dirname, require('../../src/renderer-firmware/assets/firmware/IrFirmware_v0501.bin')),
  MOTOR_FIRMWARE: path.resolve($dirname, require('../../src/renderer-firmware/assets/firmware/motor-v0501.bin')),
  TOUCH_FIRMWARE: path.resolve($dirname, require('../../src/renderer-firmware/assets/firmware/touch_v0501.bin')),
  VSERVO_FIRMWARE: path.resolve($dirname, require('../../src/renderer-firmware/assets/firmware/vservo-v0501.bin'))
}

const SPManager = function (onConnect, onDisconnect, onlineListCheck) {
  this._port = null
  this._sp = null
  this._isTransfering = false
  this.onConnect = onConnect
  this.onDisconnect = onDisconnect
  this.onlineListCheck = !!onlineListCheck
  this._autoDetect()
}

SPManager.prototype._autoDetect = function () {
  const that = this
  sp.scanInfinite(function (err, port) {
    if (err) {
      console.error('error', err)
      return
    } else {
      if (!!port) {
        if (!that._port) {
          that._port = port
          console.log('that._port', that._port)
          that.tryToConnect()
        } else {
          console.warn('can only bind one sp device! ignored...')
        }
      } else {
        console.error('no err and no port?')
      }
    }
  })
}

SPManager.prototype._port = null
SPManager.prototype._sp = null
SPManager.prototype._isTransfering = false
SPManager.prototype.onConnect = null
SPManager.prototype.onDisconnect = null
// 当在线列表改变
SPManager.prototype.onOnlineListChange = null
SPManager.prototype.onlineListPid = null
SPManager.prototype.onlineListCheck = false

SPManager.prototype.setOnlineListChangeListener = function (fn) {
  if (fn && typeof fn === 'function') {
    this.onOnlineListChange = fn
  }
}

SPManager.prototype.isConnected = function () {
  return !!this._port
}

SPManager.prototype.restart = function () {
  this._port = null
  this._sp = null
  this._isTransfering = false
  sp.stopScan()
  this._autoDetect()
}
SPManager.prototype.shop = function () {
  this._port = null
  this._sp = null
  this._isTransfering = false
  sp.stopScan()
}

SPManager.prototype.tryToConnect = function () {
  if (!this._port) return
  const that = this
  this._sp = sp.activePort(this._port, function () {
    if (that.onOnlineListChange) that.onOnlineListChange([
        0, 0, 0, 0, 0, 0, 0
      ])
    if (that.onlineListPid) {
      clearInterval(that.onlineListPid)
      that.onlineListPid = null
    }

    that._port = null
    that._sp = null
    that._isTransfering = false

    if (that.onDisconnect) {

      // sp.stopScan()
      // console.log('shop scan!!',that._port)
      // sp.releasePort_(that._port)
      // that._port = null
      // that._sp = null
      // that._isTransfering = false
      that.onDisconnect()
    // return
    }

    sp.stopScan()
    that._autoDetect()
  })

  if (this.onConnect) this.onConnect()
  if (this.onlineListCheck) this.onlineListPid = setInterval(() => {
      if (!this.isConnected()) return
      if (this._isTransfering) return

      this._sp.sendReq({
        req: req.moduleView(),
        cb: function (data) {
          // 0 ---- battery
          // 1 ---- driver
          // 2 ---- infrared
          // 3 ---- color
          // 4 ---- touch
          // 5 ---- waist
          // 6 ---- arm
          if (that.onOnlineListChange) that.onOnlineListChange(data.moduleView)
        }
      })
    }, 500)
}

SPManager.prototype.fetchOnlineListOnce = function (cb) {
  if (!this._sp) return
  if (this._isTransfering) return

  let pid = null

  this._sp.sendReq({
    req: req.moduleView(),
    cb: function (data) {
      // 0 ---- battery
      // 1 ---- driver
      // 2 ---- infrared
      // 3 ---- color
      // 4 ---- touch
      // 5 ---- waist
      // 6 ---- arm
      console.log('list', data)
      if (pid) clearTimeout(pid)
      pid = null
      if (cb) cb(data.moduleView)
    }
  })

  pid = setTimeout(() => {
    if (cb) cb([0, 0, 0, 0, 0, 0, 0])
    pid = null
  }, 2000)
}

SPManager.prototype.fetchVersion = function (cb) {
  if (!this._sp) return
  if (this._isTransfering) return

  const that = this
  this._sp.sendReq({
    req: req.firmwareVersionGet(),
    cb: function (data) {
      console.log('ver', data)
      if (typeof cb === 'function') cb(data.version)
    }
  })
}

SPManager.MODULE_BATTERY = 0x01
SPManager.MODULE_DRIVER = 0x02
SPManager.MODULE_INFRARED = 0x03
SPManager.MODULE_COLOR = 0x04
SPManager.MODULE_TOUCH = 0x05
SPManager.MODULE_WAIST = 0x06
SPManager.MODULE_ARM = 0x07
// 获取指定单个模块固件版本号
SPManager.prototype.fetchVersionSingleModule = function (m, n, cb) {
  if (!this._sp) return
  if (this._isTransfering) return

  var r = null
  switch (m) {
    case SPManager.MODULE_BATTERY:
      r = req.firmwareVersionGetBattery(n)
      break
    case SPManager.MODULE_DRIVER:
      r = req.firmwareVersionGetDriver(n)
      break
    case SPManager.MODULE_INFRARED:
      r = req.firmwareVersionGetInfrared(n)
      break
    case SPManager.MODULE_COLOR:
      r = req.firmwareVersionGetColor(n)
      break
    case SPManager.MODULE_TOUCH:
      r = req.firmwareVersionGetTouch(n)
      break
    case SPManager.MODULE_WAIST:
      r = req.firmwareVersionGetWaist(n)
      break
    case SPManager.MODULE_ARM:
      r = req.firmwareVersionGetArm(n)
      break
  }

  if (!r) return

  this._sp.sendReq({
    req: r,
    cb: function (data) {
      console.log('ballversion', data)
      if (typeof cb === 'function') cb(data.version)
    }
  })
}
// 请求进入单个模块升级
SPManager.prototype.requestSingleModuleFirmwareUpgrade = function (m, n, cb) {
  if (!this._sp) return
  if (this._isTransfering) return

  var r = null
  switch (m) {
    case SPManager.MODULE_BATTERY:
      r = req.firmwareUpgradePrepareBattery(n)
      break
    case SPManager.MODULE_DRIVER:
      r = req.firmwareUpgradePrepareDriver(n)
      break
    case SPManager.MODULE_INFRARED:
      r = req.firmwareUpgradePrepareInfrared(n)
      break
    case SPManager.MODULE_COLOR:
      r = req.firmwareUpgradePrepareColor(n)
      break
    case SPManager.MODULE_TOUCH:
      r = req.firmwareUpgradePrepareTouch(n)
      break
    case SPManager.MODULE_WAIST:
      r = req.firmwareUpgradePrepareWaist(n)
      break
    case SPManager.MODULE_ARM:
      r = req.firmwareUpgradePrepareArm(n)
      break
  }

  if (!r) return

  this._sp.sendReq({
    req: r,
    cb: function (data) {
      if (typeof cb === 'function') cb(data.status)
    }
  })
}

SPManager.prototype.upgradeModule = function (m, start, progress, ok, failed) {
  if (!this._sp) return
  if (this._isTransfering) return
  const that = this

  let pth = null

  switch (m) {
    case SPManager.MODULE_DRIVER:
      pth = BINS.MOTOR_FIRMWARE
      break
    case SPManager.MODULE_INFRARED:
      pth = BINS.IR_FIRMWARE
      break
    case SPManager.MODULE_COLOR:
      pth = BINS.COLOR_FIRMWARE
      break
    case SPManager.MODULE_TOUCH:
      pth = BINS.TOUCH_FIRMWARE
      break
    case SPManager.MODULE_WAIST:
      pth = BINS.HSERVO_FIRMWARE
      break
    case SPManager.MODULE_ARM:
      pth = BINS.VSERVO_FIRMWARE
      break
    default:
      that._sp.switchPlugin(that._sp.ccPlugin)
      that._isTransfering = false
      if (typeof failed === 'function') failed()
      return
  }

  let pid = null
  this.requestSingleModuleFirmwareUpgrade(m, 1, (status) => {
    if (status) {
      this._isTransfering = true
      let plugin = this._sp.switchPlugin(that._sp.ftPlugin)
      plugin.onDataPlus = function (status) {
        if (pid) clearTimeout(pid)
        pid = null
        if (status === 0xff) {
          plugin.onDataPlus = undefined
          that._sp.switchPlugin(that._sp.ccPlugin)
          that._isTransfering = false
          if (typeof ok === 'function') ok()
        } else {
          plugin.onDataPlus = undefined
          that._sp.switchPlugin(that._sp.ccPlugin)
          that._isTransfering = false
          if (typeof failed === 'function') failed()
        }
      }
      this._sp.transferFile(pth, {
        onBegin: function () {
          if (typeof start === 'function') start()
        },

        onProgress: function (p) {
          if (typeof progress === 'function') progress(parseInt((p * 90).toFixed(0)))
        },

        onEnd: function () {
          pid = setTimeout(() => {
            pid = null
            plugin.onDataPlus = undefined
            that._sp.switchPlugin(that._sp.ccPlugin)
            that._isTransfering = false
            if (typeof failed === 'function') failed()
          }, 35 * 1000)
        },

        onError: function (err) {
          console.log(err)
          plugin.onDataPlus = undefined
          that._sp.switchPlugin(that._sp.ccPlugin)
          that._isTransfering = false
          if (typeof failed === 'function') failed()
        },

      // onClose: function() {
      //   that._sp.switchPlugin(that._sp.ccPlugin)
      //   that._isTransfering = false
      //   if (typeof failed === 'function') failed()
      // }
      })
    } else {
      that._sp.switchPlugin(that._sp.ccPlugin)
      that._isTransfering = false
      if (typeof failed === 'function') failed()
    }
  })
}

// 主控升级
SPManager.prototype.upgrade = function (start, progress, ok, failed, version) {
  if (!this._sp) return
  if (this._isTransfering) return
  const that = this

  this._sp.sendReq({
    req: req.firmwareUpgradePrepare(1026),
    cb: function (data) {
      if (data.code === 0x01) {
        that._isTransfering = true
        that._sp.switchPlugin(that._sp.ftPlugin)

        let pth = version === 1286 ? BINS.MC_FIRMWARE_1286 : BINS.MC_FIRMWARE_1027
        that._sp.transferFile(pth, {
          onBegin: function () {
            if (typeof start === 'function') start()
          },

          onProgress: function (p) {
            if (typeof progress === 'function') progress(parseInt((p * 55).toFixed(0)))
          },

          onEnd: function () {
            that._sp.switchPlugin(that._sp.ccPlugin)
            that._isTransfering = false
            if (typeof ok === 'function') ok()
          },

          onError: function (err) {
            console.log(err)
            that._sp.switchPlugin(that._sp.ccPlugin)
            that._isTransfering = false
            if (typeof failed === 'function') failed()
          },
        // onClose: function() {
        //   that._sp.switchPlugin(that._sp.ccPlugin)
        //   that._isTransfering = false
        //   if (typeof failed === 'function') failed()
        // }
        })
      } else {
        if (typeof failed === 'function') failed()
      }
    }
  })
}

window.SPManager = SPManager
window.minimize = function () {
  // let win = BrowserWindow.getFocusedWindow()
  // if (win) win.minimize()
  app.quit()
}
