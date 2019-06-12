let SerialPort
if (process.env.NODE_ENV === 'development') {
  SerialPort = require('./serialport-mock.js')
} else {
  SerialPort = require('serialport')
}
const util = require('./util.js')
const cmdControl = require('./plugin/cmdControl.js')
const fileTransfer =require('./plugin/fileTransfer.js')
const log = require('loglevel').getLogger('serialport')


// 'debug' 信息非常繁琐，收发都会log，尤其是轮询查询
log.setLevel('info')
const baudRate = 230400

/**
 * 串口通信。串口通信分两部分，串口管理和串口通信
 * 这个类本身只有串口管理的逻辑，比如扫描串口，连接串口等。通信逻辑以注入插件方式实现。
 * 注入插件后，会将串口的接收发送等方法转发到插件，同时插件向宿主添加接口方法。插件是互斥的，某个插件生效时，其他插件将失效。更多可查看插件基类 SP_plugin.js
 * 目前有两个插件，命令控制插件和文件传输插件。激活串口后，将默认注入命令控制插件
 */
class SPManager {
  constructor() {
    // 默认扫描选项：扫描间隔 200ms，扫描超时 30s
    this.scanOptDefault = {
      interval: 200,
      timeout: 30000
    }
    // 扫描选项与回调
    this.scanOpt = null
    this.scanCB = null
    // 扫描轮询
    this.scanTask = null
    // 扫描超时看门狗
    this.scanWatchDog = null

    this.ports = []
  }

  /** @deprecated 扫描串口。扫描到串口后，自动停止扫描。所以目前只能扫描一个串口
   * 当不指定`opt`参数时（只传入一个`callback`参数），使用默认扫描参数。
   * @param opt {Object} 扫描选项。默认参数见构造函数
   * @param callback {Function} 扫描回调
   */
  scan(opt, callback) {
    if (this.scanTask) {
      log.warn('scanning... you need to stopScan first')
      return
    }
    // 简单参数类型检查
    if (arguments.length === 2) {
      // 如果指定了`opt`参数，需要显示指定
      if (!opt.interval || !opt.timeout || typeof callback !== 'function') {
        throw new TypeError('invalid arguments')
      }
      this.scanOpt = opt
      this.scanCB = callback
    } else {
      // 参数少于2个，回调是第一个参数。当然，你也可以不指定回调
      this.scanCB = opt
      // 检查回调函数
      if (this.scanCB && typeof this.scanCB !== 'function') {
        throw new TypeError('invalid arguments')
      }
      // 使用默认选项
      this.scanOpt = this.scanOptDefault
    }

    const _this = this
    // 避免多次回调。考虑场景，某次轮询，查到设备，那么将异步回调，在这个异步过程中，可能下次轮询又来了
    var finishFlag = false
    function scanResult(err, port) {
      // 设置标记
      finishFlag = true

      // 清理现场
      _this.scanOpt = null
      clearInterval(_this.scanTask)
      _this.scanTask = null
      clearTimeout(_this.scanWatchDog)
      _this.scanWatchDog = null

      // 回调
      if (_this.scanCB) {
        _this.scanCB(err, port)
        _this.scanCB = null
      }
    }
    // 开始轮询
    this.scanTask = setInterval(function() {
      SerialPort.list(function(err, ports) {

        // 多次轮询
        if (finishFlag) {
          log.warn('scan interval complete...')
          return
        }
        // 错误回调
        if (err) {
          return scanResult(err)
        }
        // 查询串口
        for (var i = 0; i < ports.length; i++) {
          var port = ports[i]
          if (port.comName.search('wchusbserial') !== -1) {
            return scanResult(null, port)
          }
        }
      })
    }, this.scanOpt.interval)
    // 看门狗
    this.scanWatchDog = setTimeout(function() {
      finishFlag = true
      if (_this.scanCB) {
        _this.scanCB(new Error('scan time out'))
        _this.scanCB = null
      }
      _this.scanOpt = null
      clearInterval(_this.scanTask)
      _this.scanTask = null
      _this.scanWatchDog = null
    }, this.scanOpt.timeout)
  }

  /**
   * 无限扫描设备。我们不加timeout，外部加
   * @param callback {Function} 扫描到设备的回调。签名 (err, port) => {}
   * err 发生错误； port 串口信息。每扫描到一个设备就回调一次
   */
  scanInfinite(callback) {
    if (this.scanTask) {
      log.warn('scanning... you need to stopScan first')
      return
    }
    const scannedSP = []
    const _this = this
    // 没有finishFlag，扫描很慢，不可能多次回调。而且多次回调也没关系，本来就是无限回调
    this.scanCB = callback
    // 开始轮询
    this.scanTask = setInterval(function() {
      log.debug('scanning...')
      SerialPort.list(function(err, ports) {
        // 错误回调
        if (err) {
          if (_this.scanCB) {
            _this.scanCB(err, null)
          }
          return
        }
        // 查询串口
        for (var i = 0; i < ports.length; i++) {
          var port = ports[i]
          // 就是这个串口
          let validPort = false
          // mac 平台
          if (process.platform === 'darwin') {
            validPort = port.comName.search('wchusbserial') !== -1
          } else {
            validPort = port.manufacturer === 'wch.cn'
          }
          if (validPort) {
            // 将串口加到已扫描列表中，并回调通知
            const found = scannedSP.findIndex((e) => {
              return e.comName === port.comName
            })
            if (found === -1) {
              scannedSP.push(port)
              if (_this.scanCB) {
                _this.scanCB(null, port)
              }
            }
          }
        }
      })
    }, 200)
  }

  /** 停止扫描
   */
  stopScan() {
    if (this.scanWatchDog) {
      clearTimeout(this.scanWatchDog)
      this.scanWatchDog = null
    }
    if (this.scanTask) {
      clearInterval(this.scanTask)
      this.scanTask = null
    }
    this.scanOpt = null
    this.scanCB = null
  }

  /** 连接串口
   * @param comPort {Object} 扫描串口得到的串口信息
   * @param closeCallback {Function} 串口关闭回调
   */
  activePort(comPort, closeCallback, failCallback, successCallback, blinkAndBeep) {
    if (!comPort) {
      log.error('invalid arguments')
      return
    }
    const _this = this
    const port = new SP(comPort, {
      onClose: function() {
        _this.releasePort_(comPort)
      },
      onError: failCallback,
      onSuccess: successCallback,
      blinkAndBeep
    })
    this.ports.push({
      port: port,
      onClose: closeCallback
    })
    return port
  }

  /**
   * 内部函数。串口断开连接后处理，调用串口关闭回调。删除串口引用
   * @param comPort {Object} 扫描串口得到的信息
   */
  releasePort_(comPort) {
    // 找到串口，调用回调
    for (var i = 0; i < this.ports.length; i++) {
      const portWrap = this.ports[i]
      if (portWrap.port.comPort.comName === comPort.comName) {
        if (typeof portWrap.onClose === 'function') {
          portWrap.onClose()
        }
        portWrap.port.destroy()
        break
      }
    }
    // 删除串口
    this.ports.splice(i, 1)
  }

  close(callback, index) {
    // this.comPort.close(callback)
    let comPort = this.ports[index]
    if(typeof callback === 'function') {
      comPort.port.close(callback)
    } else {
      comPort.port.close(comPort.onClose)
    }
  }
}

/**
 * 串口实例。创建就会自动连接串口
 */
class SP {
  constructor(comPort, cb) {
    if (!comPort) {
      log.error('invalid arguments')
      return
    }
    this.comPort = comPort
    this.callback = cb || {}

    this.port = new SerialPort(comPort.comName, { baudRate: baudRate })

    this.port.on('error', (err) => {
      log.info('Error: ', err.message)
      // 这个放前面回调。外部回调会销毁串口，和一切相关资源。所以外部回调先调用会导致这个地方plugin为空
      if (this.currentPlugin.onPortError) {
        this.currentPlugin.onPortError(err)
      }

      // 这个放前面回调。外部回调会销毁串口，和一切相关资源。所以外部回调先调用会导致这个地方plugin为空
      if (this.currentPlugin.onPortClose) {
        this.currentPlugin.onPortClose()
      }
      // 回调。修改上下文
      if (this.callback.onError) {
        this.callback.onError.call(this, err)
      }
      // 回调。修改上下文
      if (this.callback.onClose) {
        this.callback.onClose.call(this)
      }
    })

    this.port.on('close', () => {
      log.info('port is closed')
      // 这个放前面回调。外部回调会销毁串口，和一切相关资源。所以外部回调先调用会导致这个地方plugin为空
      if (this.currentPlugin.onPortClose) {
        this.currentPlugin.onPortClose()
      }
      // 回调。修改上下文
      if (this.callback.onClose) {
        this.callback.onClose.call(this)
      }
    })

    this.port.on('data', (data) => {
      log.debug('Data:', util.typedArray2HexArray(data))
      if (this.currentPlugin.onPortData) {
        this.currentPlugin.onPortData(data)
      }
    })

    this.port.on('open', () => {
      if(this.callback.onSuccess) {
        this.callback.onSuccess()
      }
    })

    this.ccPlugin = new cmdControl()
    this.inject(this.ccPlugin)

    this.ftPlugin = new fileTransfer({chunkSize: 1024})
    this.inject(this.ftPlugin)

    // 默认注入插件
    this.switchPlugin(this.ccPlugin)
  }

  close(callback) {
    this.port.close(callback)
  }

  destroy() {
    this.switchPlugin(null)
    this.ccPlugin.destroy()
    this.ftPlugin.destroy()
  }

  /**
   * 注入插件。插件使用前，必须先注入。目的就是建立一个宿主到插件的桥梁
   * @param plugin {SP_plugin} 待注入插件
   */
  inject(plugin) {
    plugin.portWrite = this.port.write.bind(this.port)

    plugin.expose(this)
  }

  /**
   * 切换插件。停止当前插件，激活目标插件。switchPlugin(null) 可以卸载插件
   * @param plugin {SP_plugin} 待切换目标插件
   */
  switchPlugin(plugin) {
    if (this.currentPlugin === plugin) {
      return
    }
    // 此前没有挂载 plugin
    if (this.currentPlugin) {
      this.currentPlugin.exit()
    }
    // 卸载 plugin
    if (plugin) {
      plugin.entrance()
    }
    this.currentPlugin = plugin
    return plugin
  }
}

module.exports = SPManager
