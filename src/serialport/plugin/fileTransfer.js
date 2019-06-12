const SP_plugin = require('./SP_plugin.js')
const fs = require('fs')
const crc = require('crc')
const util = require('../util.js')
const log = require('loglevel').getLogger('serialport')

// 帧头
const FrameType = {
  Begin: 0x3061,
  Data: 0x424C,
  End: 0x4E52,
  Resp: 0x484A
}

const TransferState = {
  Ready: 0, // 初始状态，文件传输还没有开始。切换plugin时，可能会收到上个plugin的回复，这个状态用来辅助判断
  Begin: 1, // 开始状态。就是发送开始帧。重发时会由这个状态决定发送什么帧
  Data: 2, // 同上
  End: 3 // 同上
}

/**
 * 大文件传输。协议具体请查看相关文档。大致流程是一问一答
 * 由于我执着使用 TypedArray(标准数据类型) 而不是 Buffer(node.js下的数据类型) ，所以代码有点啰嗦
 */
class SP_fileTransfer extends SP_plugin {
  constructor(opt) {
    super()

    // 分段尺寸
    this.chunkSize = opt ? (opt.chunkSize || 1024) : 1024
    // 分段数
    this.chunkCount = 0
    // 段序号
    this.chunkSeq = 0

    // 文件传输状态
    this.state = TransferState.Ready

    // 文件路径
    this.filePath = null
    // 文件数据。当前采用全部读取到内存的方式发送
    this.transferData = null
    // 回调。是个对象
    this.cb = null
  }

  expose(ctx) {
    ctx.transferFile = this.transferFile.bind(this)
    ctx.transferData = this.transferMassData.bind(this)
  }

  /**
   * 接收数据，直接在这parse了。
   */
  onPortData(data) {
    // [12, 13, 2, 1, 255, 189, 214]
    // FIXME: 如果为单模块结束状态，这里直接通过回调发出去
    if (data[0] === 0x0c && data[1] === 0x0d) {
      if (this.onDataPlus) this.onDataPlus(data[4]); // 0xff 成功 0x00失败
      return;
    }
    console.log(data);
    // 注意：data是Buffer类型，node环境下的类型
    // 没准备好前，可能存在其他控制指令的返回数据。固然可以通过帧头校验过滤，但我们直接干掉
    if (this.state === TransferState.Ready) {
      return
    }
    // 校验帧头
    if (data.readUInt16BE(0) !== FrameType.Resp || data.length !== 8) {
      log.warn('head or length check error')
      this.resendFrame()
      this.onProgress()
      return
    }
    // crc。注意，这里不能使用 new Uint8Array(data.buffer, 0, 6) 构造方式
    const r = crc.crc16modbus(data.subarray(0, 6))
    if (data.readUInt16BE(6) !== r) {
      log.warn('crc check error')
      this.resendFrame()
      this.onProgress()
      return
    }
    const err_code = data.readUInt16LE(2)
    const frame_no = data.readUInt16LE(4)
    switch (err_code) {
      case 0:
        // 无错误
        if (this.state === TransferState.Begin && frame_no === 0) {
          this.chunkSeq++
          this.state = TransferState.Data
          this.sendDataFrame()
          this.onProgress()
        } else if (this.state === TransferState.Data && frame_no > 0) {
          this.chunkSeq++
          if (this.chunkSeq > this.chunkCount) {
            this.chunkSeq = this.chunkCount
            this.state = TransferState.End
            this.sendEndFrame()
          } else {
            this.sendDataFrame()
          }
          this.onProgress()
        } else if (this.state === TransferState.End && frame_no === 0) {
          this.onEnd()
        } else {
          log.error('something must be wrong')
        }
        break
      case 1:
      case 2:
        // 超时，重发
        // 帧错误，重发
        this.resendFrame()
        this.onProgress()
        break
      case 100:
        // 致命，终止
        this.onError(new Error('mabot transfer error'))
        break
      default:
        log.error('protocol error')
    }
  }

  onPortError(err) {
    this.onError(err)
  }

  onPortClose() {
    this.onError('CLOSED!')
  }

  exit() {
    super.exit()

    this.resetState()
  }

  destroy() {
    this.resetState()
  }

  /**
   * 文件传输。这个是向外暴露接口。目前 switchPlugin 的操作要在外部管理
   * @param path {String} 文件地址路径
   * @param cb {Object} 回调通知。具体下面说明
   {
      onBegin: () => {} // 开始回调。若发生错误，不一定回调
      onProgress: number => {} // 进度回调。传入进度值，是浮点数，未格式化
      onEnd: () => {} // 结束回调。若发生错误，不一定回调。
      onError: err => {} // 错误回调。错误可能发生在传输前，传输中。发生错误将结束传输
    }
   * 文件传输是否结束，应当依赖于 onEnd 和 onError 回调通知。任何一个回调，表示结束
   */
  transferFile(path, cb) {
    if (!this.active) {
      log.warn('plugin deactive')
      return
    }
    this.resetState()
    this.filePath = path
    // 为了将来少写一个判断，默认初始化为空对象
    this.cb = cb || {}
    // 直接全部读到内存，先不使用数据流了
    fs.readFile(path, (err, data) => {
      if (err) {
        this.onError(err)
      } else {
        this.state = TransferState.Begin
        this.transferData = data
        this.chunkCount = Math.ceil(data.length / this.chunkSize)
        this.chunkSeq = 0
        this.onBegin()
        this.sendBeginFrame()
      }
    })
  }

  /** 也是文件传输
   * @param data {Buffer} 数据
   * @param cb 回调
   */
  transferMassData(data, cb) {
    if (!this.active) {
      log.warn('plugin deactive')
      return
    }
    // 为了将来少写一个判断，默认初始化为空对象
    this.cb = cb || {}

    if (!(data instanceof Buffer) || data.length === 0) {
      this.onError(new Error('invalid arguments'))
      return
    }

    this.state = TransferState.Begin
    this.transferData = data
    this.chunkCount = Math.ceil(data.length / this.chunkSize)
    this.chunkSeq = 0
    this.onBegin()
    this.sendBeginFrame()
  }

  /**
   * 下面4个方法是内部回调。基本都会回到外部回调
   * 注意：文件传输是否结束应当同时依赖于 onError 和 onEnd ，发生错误时，不会回调 onEnd，没有错误正常结束将回调 onEnd
   */
  onError(err) {
    log.error(err)

    if (this.cb && this.cb.onError) {
      this.cb.onError(err)
    }
    // 方法调用放后面，应为这里面会清理回调
    this.resetState()
  }

  onBegin() {
    log.debug('file transfer began')

    if (this.cb.onBegin) {
      this.cb.onBegin()
    }
  }

  onProgress() {
    log.debug('file transfer progress:', this.chunkSeq / this.chunkCount)

    if (this.cb.onProgress) {
      this.cb.onProgress(this.chunkSeq / this.chunkCount)
    }
  }

  /**
   * 正常发送结束回调。当发生错误时，不会回调这个方法
   */
  onEnd() {
    log.debug('file transfer end')

    if (this.cb.onEnd) {
      this.cb.onEnd()
    }
    this.resetState()
  }

  /**
   * 重置状态
   */
  resetState() {
    this.chunkSeq = 0
    this.chunkCount = 0
    this.state = TransferState.Ready

    this.filePath = null
    this.transferData = null
    this.cb = null
  }

  /**
   * 发送起始帧
   */
  sendBeginFrame() {
    const frame = new Uint8Array(10)
    frame[0] = FrameType.Begin >> 8
    frame[1] = FrameType.Begin
    frame.set(new Uint8Array(Uint16Array.of(this.chunkCount).buffer), 2)
    frame.set(new Uint8Array(Uint32Array.of(this.transferData.length).buffer), 4)
    const r = crc.crc16modbus(new Uint8Array(frame.buffer, 0, 8))
    frame[8] = r >> 8
    frame[9] = r

    log.debug('send begin:', util.typedArray2HexArray(frame))
    this.portWrite(Buffer.from(frame.buffer))
  }

  /**
   * 发送数据帧
   */
  sendDataFrame() {
    // 最后一帧长度是不确定的
    if (this.chunkSeq === this.chunkCount) {
      const lastSize = this.transferData.length - this.chunkSize * (this.chunkCount - 1)
      var frame = new Uint8Array(10 + lastSize)
      // 帧头
      frame[0] = FrameType.Data >> 8
      frame[1] = FrameType.Data
      // 帧长
      frame.set(new Uint8Array(Uint32Array.of(lastSize + 2).buffer), 2)
      // 段序号
      frame.set(new Uint8Array(Uint16Array.of(this.chunkSeq).buffer), 6)
      // 数据
      frame.set(this.transferData.subarray(this.chunkSize * (this.chunkSeq - 1)), 8)
    } else {
      var frame = new Uint8Array(10 + this.chunkSize)
      // 帧头
      frame[0] = FrameType.Data >> 8
      frame[1] = FrameType.Data
      // 帧长
      frame.set(new Uint8Array(Uint32Array.of(this.chunkSize + 2).buffer), 2)
      // 段序号
      frame.set(new Uint8Array(Uint16Array.of(this.chunkSeq).buffer), 6)
      // 数据
      frame.set(this.transferData.subarray(this.chunkSize * (this.chunkSeq - 1), this.chunkSize * this.chunkSeq), 8)
    }
    // crc
    const r = crc.crc16modbus(frame.subarray(0, -2))
    frame[frame.length - 2] = r >> 8
    frame[frame.length - 1] = r

    log.debug('send data:', util.typedArray2HexArray(frame))
    this.portWrite(Buffer.from(frame.buffer))
  }

  /**
   * 发送结束帧
   */
  sendEndFrame() {
    const frame = new Uint8Array(10)
    frame[0] = FrameType.End >> 8
    frame[1] = FrameType.End
    frame.set(new Uint8Array(Uint16Array.of(this.chunkCount).buffer), 2)
    frame.set(new Uint8Array(Uint32Array.of(this.transferData.length).buffer), 4)
    const r = crc.crc16modbus(frame.subarray(0, -2))
    frame[8] = r >> 8
    frame[9] = r

    log.debug('send end:', util.typedArray2HexArray(frame))
    this.portWrite(Buffer.from(frame.buffer))
  }

  /**
   * 重新发送
   */
  resendFrame() {
    if (this.state === TransferState.Begin) {
      this.sendBeginFrame()
    } else if (this.state === TransferState.Data) {
      this.sendDataFrame()
    } else {
      this.sendEndFrame()
    }
  }
}

module.exports = SP_fileTransfer
