process.env.DEBUG='serialport:*'

const SP = require('./sp.js')
const { req, CMD_TYPE } = require('./plugin/cmd.js')
const path = require('path')

const sp = new SP()

//测试API copy from ide4pc/src/renderer-transplant-ide4pad/native.js
const SPManager = {
  //串口
  _port: null,
  _sp: null,
  ports: [],
  scanList: [],
  activePort: null,
  previousActivePort: null,
  scanOpt: null,
  scanCB: null,
  disconnectCB: null,
  scanOptDefault: {
    interval: 200,
    timeout: 30000
  },

  //static
  MODULE_DEFAULT: 'none',
  MODULE_MASTER_CONTROL: 'master_control',
  MODULE_DRIVER: 'driver',
  MODULE_INFRARED: 'infrared',
  MODULE_COLOR: 'color',
  MODULE_BATTERY: 'battery',
  EVENT_DISCONNECT: 'event_disconnect',
  EVENT_CONNECT: 'event_connect',

  //为了最小的改动,应实现一套与cordova ble 一致的Api
  devices: [],
  activeDevice: null,
  offlineDevice: null, // 记录最近一次掉线的设备，用于重新连接
  debug: {
    module: 'none',
    data: null,
    sequence: 0, // 1-15
    online_list: {
      // moduleCount, battery, driver, infrared, color, touch, waist, arm
      mc: 0,
      battery: 0,
      driver: 0,
      infrared: 0,
      color: 0,
      touch: 0,
      waist: 0,
      arm: 0
    }
  },
  onlineTaskInternal: null,
  onlineTask: null, // 在线球列表获取interval
  debugTask: null, // 调试球interval
  firmware_version: 0,
  firmware_online_version: 0,

  /**
  @params: success   when initialized successfully
          fail      when initialized failed
  */
  init: function(success, fail) {
    //蓝牙连接需要每次连接前初始化蓝牙,串口连接则不需要这个过程
    success()
  },

  isScanning: false,
  stopScanTask: null,
  stopScan: function(callback) {
    if(!this.isScanning) return
    if(this.stopScanTask) {
      clearTimeout(this.stopScanTask)
      this.stopScanTask = null
      this.isScanning = false
      sp.stopScan()
    }
    this.scanList = []
    // 串口扫描在连接之前无法获取到设备的名字和颜色,只能每个都去连接断开获取设备信息
    console.log('端口信息', this.ports);

    let recursion = (n) => {
      if(n == 0) {
        if(this.activePort) {
          this.devices.unshift(this.activeDevice)
          this.ports.unshift(this.activePort.comPort)
        }
        if(typeof callback === 'function') {
          callback(this.devices)
        }
        return
      }
      this.scanList[n] = sp.activePort(this.ports[n - 1], () => {
        console.log('关闭', (n));
      }, null, () => {
        console.log('连接成功', (n));
        this.scanList[n].sendReq({
          req: req.getProfile(),
          cb: (resp) => {
            // this.devices[n] = {
            //   color: this.byteToColor(resp.color),
            //   name: resp.nickname
            // }
            this.devices.push({
              color: this.byteToColor(resp.color),
              name: resp.nickname
            })
            sp.close(() => {
              console.log('关闭了aaaa');
              recursion(n-1)
            }, (this.activePort ? 1 : 0))
          }
        })
      })
    }

    recursion(this.ports.length)
  },

  scanPlusCallback: null,
  scanPlus: function(start,callback, currentPortIndex) {
    if(this.isScanning) return
    this.isScanning = true

    this.ports = []
    this.devices = []

    this.scanCB = (err, port) => {
      if(err) {
        console.log(err);
      } else if(port) {
        if(this.activePort) {
          if(port.comName != this.activePort.comPort.comName) {
            this.ports.push(port)
          }
        }else {
          this.ports.push(port)
        }
        console.log('串口',this.ports);
      }
    }

    if(typeof callback === 'function') {
      this.scanPlusCallback = callback
    }

    sp.scanInfinite(this.scanCB.bind(this))

    this.stopScanTask = setTimeout(() => {
      this.stopScan(this.scanPlusCallback)
    }, 3000)
  },

  isConnected: function() {
    return this.activePort != null
  },

  setConnectedDeviceNameAndColor(name, color) {
    if (this.activeDevice) {
      this.activeDevice.name = name;
      this.activeDevice.color = color;
    }
  },

  getConnectedDeviceNameAndColor: function() {
    if(this.activePort) {
      return this.activeDevice
    }
  },

  _bindDevice: function(blinkAndBeep) {
    this.activePort.sendReq({
      req: req.getProfile(),
      cb: (resp) => {
        this.activeDevice = {
          name: resp.nickname,
          color: this.byteToColor(resp.color)
        }
        if(blinkAndBeep) {
          this.sendMakeABlinkForBleConnection(resp.color)
        }
      }
    })
    // 注册监听: 在线模块
    this.activePort.registerListener(function(resp){
      console.log(resp)
    }, CMD_TYPE.MODULE_VIEW)
    //在线模块轮询
    this.startPollBallsList()
  },

  _unbindDevice: function() {
    //取消在线列表轮询
    this.stopPollBallsList()
    //清空设备
    this.previousActivePort = this.activePort
    this.activePort = null
    this.activeDevice = null

    this.debug.online_list.mc = 0
    this.debug.online_list.battery = 0
    this.debug.online_list.driver = 0
    this.debug.online_list.infrared = 0
    this.debug.online_list.color = 0
    this.debug.online_list.touch = 0
    this.debug.online_list.waist = 0
    this.debug.online_list.arm = 0
  },

  connect: function(index, success, fail, blinkAndBeep) {
    if(this.activePort) {
      this.disconnect(() => {
        let port = this.ports[index]
        this.activePort = sp.activePort(port, () => {
          //被动断开
          this._unbindDevice()
        }, fail, () => {
          //do something inner
          if(typeof success === 'function') success()
          this._bindDevice(blinkAndBeep)
        }, blinkAndBeep)
      })
    }else {
      let port = this.ports[index]
      this.activePort = sp.activePort(port, () => {
        // 被动断开
        this._unbindDevice()
        // 触发蓝牙监听
        this.callbackWhenDisconnect()
      }, fail, () => {
        //do something inner
        if(typeof success === 'function') success()
        this._bindDevice(blinkAndBeep)
      }, blinkAndBeep)
    }

  },

  //主动断开
  disconnect: function(callback) {
    if(!this.activePort) return
    this.disconnectCB = () => {
      this._unbindDevice()
      if(typeof callback === 'function') {
        callback()
      }
    }
    sp.close(this.disconnectCB.bind(this), 0)
  },

  //通信部分调用 this.activePort.sendReq
  byteToColor: function (byte) {
    switch (byte) {
      case 0x00:
        return 'white';
      case 0x01:
        return 'red';
      case 0x02:
        return 'green';
      case 0x03:
        return 'yellow';
      case 0x04:
        return 'blue';
      case 0x05:
        return 'purple';
      case 0x06:
        return 'cyan';
      case 0x07:
        return 'orange';
      case 0x08:
        return 'white';
      default: throw new Error('Unknown color code: ' + byte);
    }
  },

  color2Byte: function (color) {
    switch (color) {
      case 'red':
        return 0x01;
      case 'green':
        return 0x02;
      case 'yellow':
        return 0x03;
      case 'blue':
        return 0x04;
      case 'purple':
        return 0x05;
      case 'cyan':
        return 0x06;
      case 'orange':
        return 0x07;
      case 'white':
        return 0x08;
      default: throw new Error('Unknown color: ' + color);
    }
  },

  // 设置昵称， 颜色
  setProfileCallbacks: null,
  setProfile: function(name, color, success, fail) {
    if(!this.activePort || !name || !color) {
      if(typeof fail === 'function') {
        fail()
        return
      }
    }
    if(name.length > 10) {
      if(typeof fail === 'function') {
        fail(new Error('Length limit!'))
        return
      }
    }
    this.isSettingProfile = true
    color = this.color2Byte(color)

    this.setProfileCallbacks = {
      success,
      fail
    }
    this.activePort.sendReq({
      req: req.setProfile(color, name),
      cb: (resp) => {
        console.log('color', resp)
        if(typeof this.setProfileCallbacks.success === 'function') {
          this.setProfileCallbacks.success(resp)
        }
        this.setProfileCallbacks = null
        this.isSettingProfile = false
        console.log('回调啊尼玛');
      }
    })
  },

  // 查询昵称， 颜色
  getProfileCallback: null,
  getProfile: function (cb) {
    this.getProfileCallback = cb;
    this.activePort.sendReq({
      req: req.getProfile(),
      cb: (resp) => {
        // console.log('color:', resp.color)
        if(typeof this.getProfileCallback === 'function') {
          this.getProfileCallback(this.byteToColor(resp.color), resp.nickname)
        }
        this.getProfileCallback = null
      }
    })
  },

  // 在线球列表
  onlineCallback: null,
  startPollBallsList: function(cb) {
    this.stopPollBallsList()
    var task = () => {
      this.onlineCallback = cb
      this.activePort.sendReq({
        req: req.moduleView(),
        cb: (resp) => {
          // 顺序是 电池、驱动球、红外、颜色、触碰、水平关节、摇摆关节
          this.debug.online_list.mc = 1
          this.debug.online_list.battery = resp.moduleView[0]
          this.debug.online_list.driver = resp.moduleView[1]
          this.debug.online_list.infrared = resp.moduleView[2]
          this.debug.online_list.color = resp.moduleView[3]
          this.debug.online_list.touch = resp.moduleView[4]
          this.debug.online_list.waist = resp.moduleView[5]
          this.debug.online_list.arm = resp.moduleView[6]
          if(typeof this.onlineCallback === 'function') {
            this.onlineCallback()
          }
          this.onlineCallback = null
        }
      })
    }
    this.onlineTask = setInterval(task, 3000)
    task()
  },

  stopPollBallsList: function() {
    if(this.onlineTask) clearInterval(this.onlineTask)
    this.onlineTask = null
  },

  // 调试
  debugCallback: null,
  debugCallbackMC: null,
  debugCallbackBattery: null,
  debugCallbackDriver: null,
  debugCallbackIR: null,
  debugCallbackColor: null,
  debugCallbackTouch: null,
  debugCallbackWaist: null,
  debugCallbackArm: null,
  startDebugBall: function(module, sequence, cb, mode) {
    this.stopDebugBall()
    let task = () => {
      switch (module) {
        case Bell.ballType.mainControl: {
          this.debugCallbackMC = cb;
          this.activePort.sendReq({
            req: req.moduleMaster(),
            cb: this.debugCallbackBattery
          })
        }
          break;
        case Bell.ballType.battery: {
          this.debugCallbackBattery = cb;
          this.activePort.sendReq({
            req: req.moduleSingleBattery,
            cb: this.debugCallbackBattery
          })
        }
          break;
        case Bell.ballType.driver: {
          this.debugCallbackDriver = cb;
          this.activePort.sendReq({
            req: req.moduleSingleDriver,
            cb: this.debugCallbackDriver
          })
        }
          break;
        case Bell.ballType.IR: {
          this.debugCallbackIR = cb;
          this.activePort.sendReq({
            req: req.moduleSingleIR,
            cb: this.debugCallbackIR
          })
        }
          break;
        case Bell.ballType.color: {
          if (!mode) return;
          this.debugCallbackColor = cb;
          this.activePort.sendReq({
            req: req.moduleSingleColor,
            cb: this.debugCallbackColor
          })
        }
          break;
        case Bell.ballType.touch: {
          this.debugCallbackTouch = cb;
          this.activePort.sendReq({
            req: req.moduleSingleTouch,
            cb: this.debugCallbackTouch
          })
        }
          break;
        case Bell.ballType.servoH: {
          this.debugCallbackWaist = cb;
          this.activePort.sendReq({
            req: req.moduleWaistJoint,
            cb: this.debugCallbackWaist
          })
        }
          break;
        case Bell.ballType.servoV: {
          this.debugCallbackArm = cb;
          this.activePort.sendReq({
            req: req.moduleArmJoint,
            cb: this.debugCallbackArm
          })
        }
          break;
      }
    }
  },
  stopDebugBall: function() {
    this.debugCallback = null;
    this.debugCallbackMC = null;
    this.debugCallbackBattery = null;
    this.debugCallbackDriver = null;
    this.debugCallbackIR = null;
    this.debugCallbackColor = null;
    this.debugCallbackTouch = null;
    this.debugCallbackWaist = null;
    this.debugCallbackArm = null;
    if (this.debugTask) clearInterval(this.debugTask);
    this.debugTask = null;
  },
  startDebugMasterControl: function (cb) {
    this.stopDebugBall()
    let task = () => {
      this.debugCallbackMC = cb
      this.activePort.sendReq({
        req: req.moduleMaster(),
        cb: (resp) => {
          if (this._isUndefined(resp.rollAngle) || this._isUndefined(resp.yawAngle) || this._isUndefined(resp.pitchAngle)) return
          if(typeof this.debugCallbackMC === 'function') {
            this.debugCallbackMC(resp.rollAngle, resp.yawAngle, resp.pitchAngle)
          }
          this.debugCallbackMC = null
        }
      })
    }
    this.debugTask = setInterval(task, 200)
    task()
  },
  startDebugBattery: function (cb) {
    this.stopDebugBall()
    let task = () => {
      this.startDebugBattery_(15, cb)
    }
    this.debugTask = setInterval(task, 5000)
    task()
  },
  startDebugBattery_: function(count, cb) {
    this.debugCallbackBattery = cb
    this.activePort.sendReq({
      req: req.moduleBatteryBatch(),
      cb: (resp => {
        if(typeof this.debugCallbackBattery === 'function') {
          this.debugCallbackBattery(resp.electricitys)
        }
        this.debugCallbackBattery = null
      })
    })
  },
  // startDebugDriver: function (count, cb) {
  //   let c = 1, angles = [], circles = []
  //   if(count <=0) {
  //     if(cb) cb(angles, circles)
  //     return
  //   }
  //   this.debugCallbackDriver = cb
  //
  //   function recursion() {
  //     if(c > count) {
  //       this.debugCallbackDriver(angles, circles)
  //       return
  //     }
  //     this.activePort.sendReq({
  //       req: req.moduleSingleDriver(c),
  //       cb: (resp) => {
  //         angles.push((resp.angle / 1600 * 360).toFixed(2))
  //         circles.push((resp.angle / 1600).toFixed(2))
  //         c++
  //         recursion()
  //       }
  //     })
  //   }
  // },
  startDebugDriver: function(count, cb) {
    this.stopDebugBall()
    this.debugCallbackDriver = cb
    let task = () => {
      this.debugCallbackDriver = cb
      this.activePort.sendReq({
        req: req.moduleDriverPositionBatch(),
        cb: (resp) => {
          let circles = []
          for(let i = 0; i < resp.angles.length; i++) {
                    circles.push(Number((resp.angles[i] / 360).toFixed(1)))
          }
          if(typeof this.debugCallbackDriver === 'function') {
            this.debugCallbackDriver(resp.angles, circles)
          }
          this.debugCallbackDriver = null
        }
      })
    }
    this.debugTask = setInterval(task, 500)
    task()
  },
  startDebugInfrared: function (cb) {
    this.stopDebugBall()

    let task = () => {
      this.debugCallbackIR  = cb
      this.activePort.sendReq({
        req: req.moduleIRBatch(),
        cb: (resp) => {
          if(typeof this.debugCallbackIR === 'function') {
            this.debugCallbackIR(resp.distance)
          }
          this.debugCallbackIR = null
        }
      })
    }
    this.debugTask = setInterval(task, 200)
    task()
  },
  startDebugColor: function (mode, cb) {
    this.stopDebugBall()

    let task = () => {
      this.debugCallbackColor = cb
      this.activePort.sendReq({
        req: req.moduleColorBatch(mode),
        cb: (resp) => {
          if(typeof this.debugCallbackColor  === 'function') {
              this.debugCallbackColor(resp.color)
          }
          this.debugCallbackColor = null
        }
      })
    }
    this.debugTask = setInterval(task, 200)
    task()
  },
  startDebugTouchSensor: function(cb) {
    this.stopDebugBall()

    let task = () => {
      this.debugCallbackTouch = cb
      this.activePort.sendReq({
        req: req.moduleTouchBatch(),
        cb: (resp) => {
          if(typeof this.debugCallbackTouch === 'function') {
            this.debugCallbackTouch(resp.arr)
          }
          this.debugCallbackColor = null
        }
      })
    }
    this.debugTask = setInterval(task, 200)
    task()
  },

  // 测试驱动球
  testDriverCallback: null,
  _testDriverTimer: null,
  testDriver: function(sequence, power, success, fail, priority) {
    if(!this.activePort) {
      if (this._testDriverTimer) clearInterval(this._testDriverTimer);
      this._testDriverTimer = null;
      return;
    }
    power = Math.min(100, Math.max(-100, power))
    this.testDriverCallback = {
      success,
      fail
    }
    if (this._testDriverTimer) clearInterval(this._testDriverTimer)
    this.__testDriverTimer = null
    if(power === 0) {
      this.activePort.sendReq({
        req: req.setSingleDriverTest(sequence, power),
        highPriority: priority,
        cb: (resp) => {
          if(typeof this.testDriverCallback.success === 'function') {
            this.testDriverCallback.success()
          }
        }
      })
    } else {
      let task = () => {
        this.activePort.sendReq({
          req: req.setSingleDriverTest(sequence, power),
          highPriority: priority,
          cb: (resp) => {
            if(typeof this.testDriverCallback.success === 'function') {
              this.testDriverCallback.success()
            }
          }
        })
      }
      this._testDriverTimer = setInterval(task, 500)
      task()
    }
  },

  // 设置驱动球极性
  driverPolarityCallback: null,
  driverPolarity: function(sequence, polarity, cb) {
    this.driverPolarityCallback = cb
    this.activePort.sendReq({
      req: req.setSingleDriverPolar(sequence, polarity),
      cb: this.driverPolarityCallback
    })
  },

  //单个驱动球颜色
  sendDebugMakeABlinkForDriver: function(sequence) {
    this._sendDebugMakeABlinkForDriver(sequence, color = 2)
  },
  _sendDebugMakeABlinkForDriver: function(sequence, color) {
    this.activePort.sendReq(req.setSingleDriverColor(sequence, mode = 3, color))
    setTimeout(() => {
      this.activePort.sendReq(req.setSingleDriverColor(sequence, mode = 1, color))
    }, 2000)
  },
  sendMakeABlinkForBleConnection: function(color) {
    this.activePort.sendReq(req.setLight( 3, 3, color))
    setTimeout(() => {
      this.activePort.sendReq(req.setLight( 3, 4, color ))
    }, 2000)
    this.sendBeepSeqWhenConnected()
  },
  sendBeepSeqWhenConnected: function() {
    this.activePort.sendReq(req.moduleBeep(Beep.BEEP_CONNECTION))
  },
  //abandon cc api
  //makeABlinkWhenMapping
  //cockPeckHitWithMapping
  //makeARotateWhenMappingWaist
  //makeARotateWhenMappingArm
  //lightUpOrDownDriversWhenMapping
  //startDebugWaistJoin
  //startDebugArmJoin
  //startDebugTouchSensor
  //startDebugWaistJoin
  //startDebugWaistJoin

  // 设置水平关节球角度
  setWaistJoinAngleCallback: null,
  _lastWaistJoinMotionMillis: 0,
  setWaistJoinAngle: function(index, angle, success, fail) {
    angle = Math.min(165, Math.max(15, angle))
    var now = new Date().getTime()
    if(angle !== 90) {
      if (this._lastWaistJoinMotionMillis > 0) {
        var delta = now - this._lastWaistJoinMotionMillis;
        if (delta < 300) {
          return;
        } else {
          this._lastWaistJoinMotionMillis = now;
        }
      }
    } else {
      this._lastWaistJoinMotionMillis = now
    }
    this.setWaistJoinAngleCallback = {
      success,
      fail,
    }
    this.activePort.sendReq({
      req: req.setWaistJoint(index, angle),
      cb: (resp) => {
        if(typeof this.setWaistJoinAngleCallback === 'function') {
          this.setWaistJoinAngleCallback.success(resp)
        }
        this.setWaistJoinAngleCallback = null
      }
    })
  },

  // 设置摇摆关节球角度
  setArmJoinAngleCallback: null,
  _lastArmJoinMotionMillis: 0,
  setArmJoinAngle: function (index, angle, success, fail) {
    angle = Math.min(165, Math.max(15, angle))
    var now = new Date().getTime()
    if (angle !== 90) {
      if (this._lastArmJoinMotionMillis > 0) {
        var delta = now - this._lastArmJoinMotionMillis
        if (delta < 300) {
          return;
        } else {
          this._lastArmJoinMotionMillis = now;
        }
      }
    } else {
      this._lastArmJoinMotionMillis = now;
    }
    this.setArmJoinAngleCallback = {
      success,
      fail,
    }
    this.activePort.sendReq({
      req: req.setArmJoint(index, angle),
      cb: (resp) => {
        if(typeof this.setArmJoinAngleCallback.success === 'function') {
          this.setArmJoinAngleCallback.success(resp)
        }
        this.setArmJoinAngleCallback.success = null
      }
    })
  },

  // 获取驱动球极性
  getDriverPolarityCallback: null,
  getDriverPolarity: function(sequence, cb) {
    this.getDriverPolarityCallback = cb
    this.activePort.sendReq({
      req: req.motorPolarity(sequence),
      cb: this.getDriverPolarityCallback
    })
  },
  driverReset: function(sequence) {
    this.activePort.sendReq(req.setSingleDriverReset(sequence))
  },
  // abandon cc api
  // driverMotionPlus

  // mabotGo api
  // driverMotionOrangUtan
  // jointMotionOrangUtan
  // jointMotionM
  // driverMotionDropdownSwingBalance
  // driverMotionAutoSwingBalance

  onlineDriverCount: function() {
    return this.debug.online_list.driver
  },

  // switchToMcContext
  switchToLuaContext: function() {
    this.activePort.sendReq(req.envSwitchToLua())
  },

  // swapTwoArmJointMapOrangutan

  downloadProgress: 0,

  progressCallback: null,
  readFileAsBytesFromNativeAppDir: function(path, ok, fail) {

  },

  fileTransferBin: function(data, progressCallback, isScript) {
    if(!this.isConnected()) {
      // 未连接
      if(progressCallback) progressCallback(-1)
      return
    }
    if(this.downloadProgress != 0) {
      // 已经有脚本在下载
      if(progressCallback) progressCallback(-1)
      return
    }

    // var raw = Array.from(bytes)
    // var length = raw.length
    // console.log('file length: ' + (length / 512).toFixed(2) + ' Kb. ' + length + ' bytes')
    //
    // var CHUNK_SIZE = 512 //128;
    // var TOTAL_SIZE = length
    // var chunkCount = parseInt(TOTAL_SIZE / CHUNK_SIZE) +
    //   ((Math.round(TOTAL_SIZE % CHUNK_SIZE) == 0) ? 0 : 1);
    // var chunkSeq = 1
    // console.log('分块数: ' + chunkCount)
    // // 监听(开始, 传输, 结束)

    // 开始传输要切换插件
    this.activePort.switchPlugin(this.activePort.ftPlugin)
    this.activePort.transferData(data, {
      onBegin: () => {
        console.log('开始');
      },
      onProgress: p => {
        console.log('进度', p)
        let progress = parseInt(p * 100)
        console.log(progress)
        if(progressCallback) progressCallback(progress)
      },
      onEnd: () => {
        console.log('结束');
        this.activePort.switchPlugin(this.activePort.ccPlugin)

        // 立即执行
        if(isScript) {
          this.activePort.sendReq(req.envSwitchToLua())
        }
        if(progressCallback) progressCallback(100)
      },
      onError: () => {
        this.activePort.switchPlugin(this.activePort.ccPlugin)
      }
    })
  },

  feedbackMotor: function(seq) {
    if(!this.isConnected()) return
    // this.activePort.sendReq({
    //   req: req.setLight(2 ,3, this.color2Byte(this.activeDevice.color)),
    //   cb: () => {
    //     console.log('fuck you');
    //   }
    // })
    this.activePort.sendReq({
      req: req.setLight(2 ,3, this.color2Byte(this.activeDevice.color)),
      cb: (resp) => {

      }
    })

    this.activePort.sendReq(req.setSingleDriverColor(seq, 3, this.color2Byte(this.activeDevice.color)))
  },

  feedbackMotorBatch: function() {
    if(!this.isConnected()) return
    this.activePort.sendReq(req.setLight(2, 3, this.color2Byte(this.activeDevice.color)))
  },

  feedbackMotorSingleTurnOff: function(seq) {
    if (!this.isConnected()) return

    this.activePort.sendReq(req.setSingleDriverColor(seq, 1, 2))
  },

  feedbackMotorSingleTurnOn: function(req) {
    if (!this.isConnected()) return

    this.activePort.sendReq(req.setSingleDriverColor(seq, 3, 2))
  },

  feedbackMotorTurnOffAll: function() {
    if (!this.isConnected()) return
    this.activePort.sendReq({
      req: req.setLight(2, 2, 2),
      cb: () => {
        this.activePort.sendReq(req.setLight(2, 1, 2))
      }
    })
  },

  feedbackWaist: function(seq) {
    if (!this.isConnected()) return

    this.debugCallbackWaist = function (ang) {
      if (ang <= 25) {
        var arr = [
          { angle: ang + 10, delay: 0 },
          { angle: ang + 20, delay: 100 },
          { angle: ang + 10, delay: 100 },
          { angle: ang, delay: 100 }
        ];
        this.feedbackWaistInternal(arr, seq);
      } else if (ang < 155) {
        var arr = [
          { angle: ang + 10, delay: 0 },
          { angle: ang - 10, delay: 100 },
          { angle: ang, delay: 100 }
        ];
        this.feedbackWaistInternal(arr, seq);
      } else {
        var arr = [
          { angle: ang - 10, delay: 0 },
          { angle: ang - 20, delay: 100 },
          { angle: ang - 10, delay: 100 },
          { angle: ang, delay: 100 }
        ];
        this.feedbackWaistInternal(arr, seq);
      }
    }

    this.activePort.sendReq(req.moduleWaistJoint(seq))
  },

  feedbackWaistInternal: function(args, seq) {
    if (!this.isConnected()) return
    if (!args) return

    var delaySum = 0;
    for (let i = 0; i < args.length; i++) {// 用let简单，避免closure
      var task = function () {
        var angle = args[i].angle;
        angle = Math.min(165, Math.max(15, angle));

        this.activePort.sendReq(req.setWaistJoint(seq, angle))
      };
      var delay = delaySum + args[i].delay;
      if (args[i].delay === 0) task(); // 没有延迟，直接执行
      else if (args[i].delay > 0) setTimeout(task, delay); // 有延迟按照累计序列delay做叠加
      else console.warn('Invalid delay parameter: ' + args[i].delay);
      delaySum += args[i].delay;
    }
  },

  feedbackArm: function(seq) {
    if (!this.isConnected()) return

    this.debugCallbackArm = function (ang) {
      if (ang <= 25) {
        var arr = [
          { angle: ang + 10, delay: 0 },
          { angle: ang + 20, delay: 100 },
          { angle: ang + 10, delay: 100 },
          { angle: ang, delay: 100 }
        ];
        this.feedbackArmInternal(arr, seq);
      } else if (ang < 155) {
        var arr = [
          { angle: ang + 10, delay: 0 },
          { angle: ang - 10, delay: 100 },
          { angle: ang, delay: 100 }
        ];
        this.feedbackArmInternal(arr, seq);
      } else {
        var arr = [
          { angle: ang - 10, delay: 0 },
          { angle: ang - 20, delay: 100 },
          { angle: ang - 10, delay: 100 },
          { angle: ang, delay: 100 }
        ];
        this.feedbackArmInternal(arr, seq);
      }
    }

    this.activePort.sendReq(req.moduleArmJoint(req))
  },

  feedbackArmInternal: function(args, seq) {
    if (!this.isConnected()) return
    if (!args) return
    var delaySum = 0;
    for (let i = 0; i < args.length; i++) { // 用let简单，避免closure
      var task = function () {
        var angle = args[i].angle;
        angle = Math.min(165, Math.max(15, angle));

        this.activePort.sendReq(req.setArmJoint(seq, angle))
      };
      var delay = delaySum + args[i].delay;
      if (args[i].delay === 0) task(); // 没有延迟，直接执行
      else if (args[i].delay > 0) setTimeout(task, delay); // 有延迟按照累计序列delay做叠加
      else console.warn('Invalid delay parameter: ' + args[i].delay);
      delaySum += args[i].delay;
    }
  },

  getWaistAngle: function(seq, callback) {
    if (!this.isConnected()) return
    this.debugCallbackWaist = function (ang) {
      if (typeof callback == "function") callback(ang);
    }; // callback will be removed in the future

    this.activePort.sendReq(req.moduleWaistJoint(seq))
  },

  getWaistAngles: function(callback) {
    if (!this.isConnected()) return
    this.onBatchWaist = function (arr) {
      if (typeof callback == "function") callback(arr);
    }; // callback will be removed in the future
    this.activePort.sendReq({
      req: req.moduleWaistJointBatch(),
      cb: () => {
        if(typeof this.onBatchWaist === 'function') {
          this.onBatchWaist()
        }
        this.onBatchWaist = null
      }
    })
  },

  setWaistAngles: function(arr) {
    if (!this.isConnected()) return

    this.activePort.sendReq(req.setWaistJointBatch(arr))
  },

  getArmAngle: function(req, callback) {
    if (!this.isConnected()) return
    this.debugCallbackArm = function (ang) {
      if (typeof callback == "function") callback(ang);
    }; // callback will be removed in the future

    this.activePort.sendReq(req.moduleArmJoint(req))
  },

  getArmAngles: function(callback) {
    if (!this.isConnected()) return
    this.onBatchArm = function (arr) {
      if (typeof callback == "function") callback(arr);
    }; // callback will be removed in the future

    this.activePort.sendReq(req.moduleArmJointBatch())
  },

  setArmAngles: function(arr) {
    if (!this.isConnected()) return

    this.activePort.sendReq(req.setArmJointBatch(arr))
  },

  feedbackColorIntervalId: null,
  feedbackColor: function(seq) {
    if (this.feedbackColorIntervalId) {
      clearInterval(this.feedbackColorIntervalId);
      this.feedbackColorIntervalId = null;
    }

    this.activePort.sendReq(req.moduleColorBatch(2))

    if (!this.isConnected()) return
    var isEnv = true
    var task = () => {
      this.activePort.sendReq(req.moduleSingleColor(seq, isEnv ? 1 : 2))
      isEnv = !isEnv;
    };

    this.feedbackColorIntervalId = setInterval(task, 500)
  },

  feedbackColorBatch: function() {

  },

  feedbackColorTurnOff: function() {
    if (this.feedbackColorIntervalId) {
      clearInterval(this.feedbackColorIntervalId);
      this.feedbackColorIntervalId = null;
    }

    this.activePort.sendReq(req.moduleColorBatch(2))
  },

  feedbackTouchIntervalId: null,
  feedbackTouch: function(cb) {
    if (this.feedbackTouchIntervalId) {
      clearInterval(this.feedbackTouchIntervalId);
      this.feedbackTouchIntervalId = null;
    }
    if (!this.isConnected()) return

    var task = () => { // arr -> [ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
      this.onBatchTouch = function (arr) { if (cb) cb(arr); };

      this.activePort.sendReq({
        req: req.moduleTouchBatch(),
        cb: () => {
          if(typeof this.onBatchTouch === 'function') {
            this.onBatchTouch()
          }
          this.onBatchTouch = null
        }
      })
    };
  },

  feedbackTouchTurnOff: function() {
    if (this.feedbackTouchIntervalId) {
      clearInterval(this.feedbackTouchIntervalId);
      this.feedbackTouchIntervalId = null;
    }
  },

  feedbackInfraredIntervalId: null,
  feedbackInfrared: function(cb) {
    if (this.feedbackInfraredIntervalId) {
      clearInterval(this.feedbackInfraredIntervalId);
      this.feedbackInfraredIntervalId = null;
    }
    if (!this.isConnected()) return

    var task = () => {
      this.onBatchInfrared = function (arr) { if (cb) cb(arr); };

      this.activePort.sendReq({
        req: req.moduleIRBatch(),
        cb: () => {
          if(typeof this.onBatchInfrared === ' function') {
            this.onBatchInfrared()
          }
          this.onBatchInfrared = null
        }
      })
    }
    this.feedbackInfraredIntervalId = setInterval(task, 200);
  },

  feedbackInfraredTurnOff: function() {
    if (this.feedbackInfraredIntervalId) {
      clearInterval(this.feedbackInfraredIntervalId);
      this.feedbackInfraredIntervalId = null;
    }
  },

  feedbackWaistBatch: function(seqs) {
    if (!this.isConnected()) return
    if (!seqs || seqs.length === 0) return

    this.onBatchWaist = function (angs) {
      var snapshot = [];
      for (var i = 0; i < angs.length; i++) {
        var ang = angs[i];
        if (ang <= 180 && ang >= 0) {
          snapshot.push({ ang: ang, ignore: seqs.indexOf(i + 1) < 0 });
        } else {
          // ignore
          snapshot.push(null);
        }
      }
      console.log('snapshot: ' + snapshot);

      var stage1 = {
        angles: [],
        delay: 0
      }, stage2 = {
        angles: [],
        delay: 100,
      }, stage3 = {
        angles: [],
        delay: 100,
      }, stage4 = {
        angles: [],
        delay: 100
      };
      for (var i = 0; i < snapshot.length; i++) {
        if (!snapshot[i]) { // 不在线的，补0
          stage1.angles.push(0);
          stage2.angles.push(0);
          stage3.angles.push(0);
          stage4.angles.push(0);
          continue;
        }
        if (!snapshot[i].ignore) {
          if (snapshot[i].ang < 0) {
            stage1.angles.push(0);
            stage2.angles.push(0);
            stage3.angles.push(0);
            stage4.angles.push(0);
          } else if (snapshot[i].ang < 25) {
            stage1.angles.push(snapshot[i].ang + 10);

            stage2.angles.push(snapshot[i].ang + 20);

            stage3.angles.push(snapshot[i].ang + 10);

            stage4.angles.push(snapshot[i].ang);
          } else if (snapshot[i].ang < 155) {
            stage1.angles.push(snapshot[i].ang + 10);

            stage2.angles.push(snapshot[i].ang - 10);

            stage3.angles.push(snapshot[i].ang);

            stage4.angles.push(snapshot[i].ang);
          } else {
            stage1.angles.push(snapshot[i].ang - 10);

            stage2.angles.push(snapshot[i].ang - 20);

            stage3.angles.push(snapshot[i].ang - 10);

            stage4.angles.push(snapshot[i].ang);
          }
        } else {
          stage1.angles.push(snapshot[i].ang);
          stage2.angles.push(snapshot[i].ang);
          stage3.angles.push(snapshot[i].ang);
          stage4.angles.push(snapshot[i].ang);
        }
      }
      that.feedbackWaistBatchInternal([
        stage1, stage2, stage3, stage4
      ]);
    }

    this.activePort.sendReq({
      req: req.moduleWaistJointBatch(),
      cb: () => {
        if(typeof this.onBatchWaist === 'function') {
          this.onBatchWaist()
        }
        this.onBatchWaist = null
      }
    })
  },

  feedbackWaistBatchInternal: function() {
    if (!this.isConnected()) return
    if (!args || args.length === 0) return

    var delaySum = 0
    for (let i = 0; i < args.length; i++) {
      if (args[i].angles.length !== 15) {
        console.warn('frame angles size error: ' + args[i].angles);
        continue;
      }
      var task = () => {
        var angles = args[i].angles;
        for (var j = 0; j < angles.length; j++) {
          if (angles[j] > 0) angles[j] = Math.min(165, Math.max(15, angles[j]));
        }
        console.log('frame ' + (i + 1) + ': ' + args[i].angles);

        this.activePort.sendReq(req.setWaistJointBatch(angles))
      };
      var delay = delaySum + args[i].delay;
      if (args[i].delay === 0) task();
      else if (args[i].delay > 0) setTimeout(task, delay);
      else console.warn('Invalid delay parameter: ' + args[i].delay);
      delaySum += args[i].delay;
    }
  },

  feedbackArmBatch: function(seqs) {
    if (!this.isConnected()) return
    if (!seqs || seqs.length === 0) return

    this.onBatchArm = function (angs) {
      var snapshot = [];
      for (var i = 0; i < angs.length; i++) {
        var ang = angs[i];
        if (ang <= 180 && ang >= 0) {
          snapshot.push({ ang: ang, ignore: seqs.indexOf(i + 1) < 0 });
        } else {
          snapshot.push(null);
        }
      }

      var stage1 = { angles: [], delay: 0 };
      var stage2 = { angles: [], delay: 100 };
      var stage3 = { angles: [], delay: 100 };
      var stage4 = { angles: [], delay: 100 };
      for (var i = 0; i < snapshot.length; i++) {
        if (!snapshot[i]) { // 不在线的，补0
          stage1.angles.push(0);
          stage2.angles.push(0);
          stage3.angles.push(0);
          stage4.angles.push(0);
          continue;
        }
        if (!snapshot[i].ignore) {
          if (snapshot[i].ang < 0) {
            stage1.angles.push(0);
            stage2.angles.push(0);
            stage3.angles.push(0);
            stage4.angles.push(0);
          } else if (snapshot[i].ang < 25) {
            stage1.angles.push(snapshot[i].ang + 10);

            stage2.angles.push(snapshot[i].ang + 20);

            stage3.angles.push(snapshot[i].ang + 10);

            stage4.angles.push(snapshot[i].ang);
          } else if (snapshot[i].ang < 155) {
            stage1.angles.push(snapshot[i].ang + 10);

            stage2.angles.push(snapshot[i].ang - 10);

            stage3.angles.push(snapshot[i].ang);

            stage4.angles.push(snapshot[i].ang);
          } else {
            stage1.angles.push(snapshot[i].ang - 10);

            stage2.angles.push(snapshot[i].ang - 20);

            stage3.angles.push(snapshot[i].ang - 10);

            stage4.angles.push(snapshot[i].ang);
          }
        } else {
          stage1.angles.push(snapshot[i].ang);
          stage2.angles.push(snapshot[i].ang);
          stage3.angles.push(snapshot[i].ang);
          stage4.angles.push(snapshot[i].ang);
        }
      }
      that.feedbackArmBatchInternal([
        stage1, stage2, stage3, stage4
      ]);
    }

    this.activePort.sendReq({
      req: req.moduleArmJointBatch(),
      cb: () => {
        if(typeof this.onBatchArm === 'function') {
          this.onBatchArm()
        }
        this.onBatchArm = null
      }
    })
  },

  feedbackArmBatchInternal: function(args) {
    if (!this.isConnected()) return
    if (!args || args.length === 0) return

    var delaySum = 0
    for (let i = 0; i < args.length; i++) {
      if (args[i].angles.length !== 15) {
        console.warn('frame angles size error: ' + args[i].angles);
        continue;
      }
      var task = function () {
        var angles = args[i].angles;
        for (var j = 0; j < angles.length; j++) {
          if (angles[j] > 0) angles[j] = Math.min(165, Math.max(15, angles[j]));
        }
        console.log('frame ' + (i + 1) + ': ' + args[i].angles);

        this.activePort.sendReq(req.setArmJointBatch(angles))
      };
      var delay = delaySum + args[i].delay;
      if (args[i].delay === 0) task();
      else if (args[i].delay > 0) setTimeout(task, delay);
      else console.warn('Invalid delay parameter: ' + args[i].delay);
      delaySum += args[i].delay;
    }
  },

  checkPermissionLolipop: function(cb) {

  },

  //注册监听
  listenerId: null,
  registerListener: function(fn, filter) {
    if(listenerId) return
    if(arguments.length === 2) {
      this.listenerId = this.activePort.registerListener(fn, filter)
    } else {
      this.listenerId = this.activePort.registerListener(fn)
    }
  },

  //取消注册监听
  unregisterListener: function() {
    if(!this.listenerId) return
    this.activePort.unregisterListener(this.listenerId)
  },

  //蓝牙断开监听api
  disconnectListener: null,
  _disconnectListeners: [],
  registerDisconnectListener: function(l) {
    this._disconnectListeners.push(l)
  },
  unregisterDisconnectListener : function() {
    this._disconnectListeners.pop()
  },
  callbackWhenDisconnect: function() {
    if(this._disconnectListeners) {
      // if(!this.isSettingProfile) {
        for(let i = 0; i < this._disconnectListeners.length; i++) {
          let l = this._disconnectListeners[i]
          if(typeof l === 'function') l()
        }
      // }
    }
    this.clearWhenDisconnect()
  },
  clearWhenDisconnect: function() {
    // dosomething cleanning when device is disconnected
  },
  _isUndefined: function(param) {
    return typeof param === 'undefined'
  },
}

window.SPManager = SPManager


//调用API测试
const ports = []
let defaultPort = null
document.getElementById('scan').onclick = function() {
  console.log('scan')
  // sp.scanInfinite(function(err, port) {
  //   if (err) {
  //     console.log(err)
  //   } else {
  //     console.log(port)
  //     ports.push(port)
  //     console.log(ports);
  //   }
  // })
  SPManager.scanPlus(null, (devices) => {
    console.log(devices);
  })
}
document.getElementById('stop-scan').onclick = function() {
  console.log('stop scan')

  SPManager.stopScan()
}
document.getElementById('active-port').onclick = function() {
  console.log('active port')

  // defaultPort = sp.activePort(ports[0], function() {
  //   defaultPort = null
  //   ports.shift()
  // }, function() {
  //   console.log('失败');
  // }, function() {
  //   console.log('连接成功');
  // })
  SPManager.connect(0, function() {
    console.log('连接成功');
  }, function() {
    console.log('连接失败');
  }, false)
}

document.getElementById('close').onclick = function() {
  console.log(SPManager.activePort)
  SPManager.disconnect(() => {
    console.log('关掉了串口');
  })
}


document.getElementById('get-profile').onclick = function() {
  // defaultPort.sendReq({
  //   req: req.getProfile(),
  //   cb: function(resp) {
  //     console.log('color:', resp.color)
  //   }
  // })
  // SPManager.sendReq({
  //   req: req.setProfile(3, 3),
  //   cb: (resp) => {
  //     console.log(resp);
  //   }
  // })
  SPManager.feedbackMotor(1)
  // SPManager.setProfile('fuck', 'yellow')


}
// document.getElementById('set-profile').onclick = function() {
//   defaultPort.sendReq({
//     req: req.setProfile('red', 'skyfuck'),
//     cb: function(resp) {
//       console.log('color:', resp.color)
//     }
//   })
// }

document.getElementById('module-view').onclick = function() {
  SPManager.startPollBallsList()
}

document.getElementById('module-arm-joint').onclick = function() {
  defaultPort.sendReq(req.moduleArmJoint(1))
}

document.getElementById('set-arm-joint').onchange = function() {
  defaultPort.sendReq(req.setArmJoint(1, document.getElementById('set-arm-joint').value))
}

document.getElementById('module-waist-joint').onclick = function() {
  defaultPort.sendReq(req.moduleWaistJoint(1))
}

document.getElementById('module-waist-joint-batch').onclick = function() {
  defaultPort.sendReq(req.moduleWaistJointBatch())
}

document.getElementById('module-arm-joint-batch').onclick = function() {
  defaultPort.sendReq(req.moduleArmJointBatch())
}

document.getElementById('set-waist-joint').onchange = function() {
  defaultPort.sendReq(req.setWaistJoint(1, document.getElementById('set-waist-joint').value))
}

document.getElementById('module-driver').onclick = function() {
  defaultPort.sendReq(req.moduleSingleDriver(1))
}
document.getElementById('module-driver-position-batch').onclick = function() {
  defaultPort.sendReq(req.moduleDriverPositionBatch())
}

document.getElementById('set-driver-test').onchange = function() {
  defaultPort.sendReq(req.setSingleDriverTest(1, document.getElementById('set-driver-test').value))
}
document.getElementById('set-driver-polar').onchange = function() {
  defaultPort.sendReq(req.setSingleDriverPolar(1, document.getElementById('set-driver-polar').value))
}
document.getElementById('module-driver-polar').onclick = function() {
  defaultPort.sendReq(req.setSingleDriverPolar(1, document.getElementById('set-driver-polar').value))
}
document.getElementById('set-driver-color2').onchange = function() {
  defaultPort.sendReq(req.setSingleDriverColor(1, document.getElementById('set-driver-color1').value, (document.getElementById('set-driver-color2').value || 1)))
}
document.getElementById('module-touch').onclick = function() {
  defaultPort.sendReq(req.moduleSingleTouch(1))
}

document.getElementById('motor-polarity').onclick = function() {
  defaultPort.sendReq(req.motorPolarity(1))
}

document.getElementById('module-battery-Batch').onclick = function() {
  defaultPort.sendReq(req.moduleBatteryBatch())
}

var listenerId = null;
document.getElementById('register-listener').onclick = function() {
  // listenerId = defaultPort.registerListener(function(resp) {
  //   console.log(resp)
  // })
  SPManager.registerDisconnectListener(function(resp) {
    console.log(resp);
  })
}
document.getElementById('unregister-listener').onclick = function() {
  if (listenerId !== null) {
    defaultPort.unregisterListener(listenerId)
  }
}
var pollId
document.getElementById('poll-module-view').onclick = function() {
  pollId = setInterval(function() {
    defaultPort.sendReq(req.moduleView())
  }, 1500)
}
document.getElementById('unpoll-module-view').onclick = function() {
  clearInterval(pollId)
}

document.getElementById('file-transfer').onclick = function() {
  defaultPort.switchPlugin(defaultPort.ftPlugin)
  defaultPort.transferFile(path.resolve(__dirname, './test.lua'), {
    onBegin: () => {},
    onProgress: p => {},
    onEnd: () => {
      defaultPort.switchPlugin(defaultPort.ccPlugin)
    },
    onError: () => {
      defaultPort.switchPlugin(defaultPort.ccPlugin)
    }
  })
}
