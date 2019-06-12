const SP_plugin = require('./SP_plugin.js')
const { PARSE_CODE, parseData } = require('./cmd.js')
const util = require('../util.js')
const log = require('loglevel').getLogger('serialport')

/**
 * 命令控制插件。基本逻辑是启动一个interval固定时间从发送队列中取数据。发送间隔应当跟硬件开发人员咨询
 */
class SP_cmdControl extends SP_plugin {
  constructor(loopInterval, rqWidth, rqsWidth) {
    super()

    // pull queue
    this.reqLoop = null
    this.reqLoopInterval = loopInterval || 100
    // 先进先出队列
    this.reqQueue = []
    this.rqWidth = rqWidth || 5
    // 强力先进先出队列
    this.reqQueueS = []
    this.rqsWidth = rqsWidth || 5

    // 缓冲区。不需要很大，本来指令回复设计在20字节内，偶尔有超出的，总之64足够
    this.respBuffer = new Uint8Array(64)
    this.respLength = 0

    // 监听队列
    this.respListenerQueue = []
    // 请求回调队列
    this.respCb = []
  }

  // 向宿主添加方法
  expose(ctx) {
    ctx.sendReq = this.sendReq.bind(this)
    ctx.clearRespBuffer = this.clearRespBuffer.bind(this)
    ctx.registerListener = this.registerListener.bind(this)
    ctx.unregisterListener = this.unregisterListener.bind(this)
  }

  onPortData(data) {
    // 缓存
    this.respBuffer.set(data, this.respLength)
    this.respLength += data.length
    this.parseResp()
  }

  entrance() {
    super.entrance()

    this.loop()
  }

  exit() {
    super.exit()

    clearInterval(this.reqLoop)
    // 清空队列。这不是太好，`reqQueueS` 应该发送完毕才对
    while (this.reqQueue.shift() || this.reqQueueS.shift()) {

    }
    this.respLength = 0
  }

  destroy() {
    clearInterval(this.reqLoop)
    while (this.reqQueue.shift() || this.reqQueueS.shift() || this.respCb.shift() || this.respListenerQueue.shift()) {

    }
    this.reqQueue = null
    this.reqQueueS = null
    this.respCb = null
    this.respListenerQueue = null
    this.respBuffer = null
  }

  loop() {
    const _this = this
    this.reqLoop = setInterval(function() {
      if (!_this.active) {
        log.warn('plugin deactive')
        return
      }
      var req = _this.reqQueueS.shift()
      if (req) {
        // enqueue
        _this.respCb.push({
          head: req.req.head,
          cb: req.cb
        })
        req = req.req
      } else {
        req = _this.reqQueue.shift()
        if(req && req.cb) {
          _this.respCb.push({
            head: req.req.head,
            cb: req.cb
          })
          req = req.req
        }
      }
      if (req) {
        const data = req.genReq()
        log.debug('send req:', util.typedArray2HexArray(data))
        _this.portWrite(Buffer.from(data.buffer))
      }
    }, this.reqLoopInterval)
  }

  /**
   * 清空缓冲区。一般没什么卵用
   */
  clearRespBuffer() {
    this.respLength = 0
  }

  /**
   * 发送命令。
   * @param req {ReqBase | Object} 如果是 ReqBase ,进入低优先级队列；如果是 Object，数据结构如下
   {
     req: {ReqBase}, // 请求命令
     highPriority: {Bool}, // 是否高优先级。
     cb: {Function} // 该请求响应的回调。详细如下面讨论
   }
   * @discuss 关于该方法的一些说明。发送请求存在两个队列，低优先级和高优先级。低优先级队列的队列满了之后，
   * 将丢弃最早的请求。所以如果你希望得到响应回调，应该放入高优先级队列中。很不幸，高优先级队列也存在满溢，
   * 而且算法跟低优先级队列一样，也是丢弃最早的请求。不过消费者自然会优先消费高优先级队列。
   * 另外一点需要注意，响应回调，是不靠谱的。协议的特性决定，收到响应时，我们根本无法知道是哪个请求的响应。
   * 关于回调的算法：直到消费时，回调函数入队。收到响应时，从回调队列起始检索，头部匹配的第一个回调被调用，
   * 而在这个回调之前的回调，被认为是没收到响应，要被丢弃。例子：假设请求队列：A B D B C A 。回复序列：
   * A D B A。收到 D 时，B 的回调被丢弃，收到 A 时，C 的回调被丢弃
   */
  sendReq(req) {
    if (!this.active) {
      log.warn('command control plugin deactive')
      return
    }
    // // 复合请求
    // if (req.req) {
    //   if (this.reqQueueS.length >= this.rqsWidth) {
    //     log.warn('traffic overload')
    //     this.reqQueueS[this.rqsWidth - 1] = req
    //   } else {
    //     this.reqQueueS.push(req)
    //   }
    // } else {
    //   // 简单请求，进入低优先级队列
    //   if (this.reqQueue.length >= this.rqWidth) {
    //     log.warn('traffic overload')
    //     this.reqQueue[this.rqWidth - 1] = req
    //   } else {
    //     this.reqQueue.push(req)
    //   }
    // }

    // 不通过是否是复合请求判断，而是简单队列进入低优先级，复合队列在指定了highPriority属性为真时,进入高优先级队列，否则默认低优先级队列
    if(req.highPriority) {
      if (this.reqQueueS.length >= this.rqsWidth) {
        log.warn('traffic overload')
        this.reqQueueS[this.rqsWidth - 1] = req
      } else {
        this.reqQueueS.push(req)
      }
    } else {
      if (this.reqQueue.length >= this.rqWidth) {
        log.warn('traffic overload')
        this.reqQueue[this.rqWidth - 1] = req
      } else {
        this.reqQueue.push(req)
      }
    }
  }

  /**
   * 注册响应监听。filter参数指定监听响应类型，可选，不传就监听所有响应
   * @param fn {Function} 监听回调
   * @param filter {Number | Function} Number时，代表按头部过滤
   * @return {Number} 用于取消监听
   */
  registerListener(fn, filter) {
    // 参数检查
    if (typeof fn !== 'function') {
      log.error('invalid arguments')
      return
    }
    if (typeof filter === 'number') {
      const head = filter
      filter = function(resp) {
        return resp.head === head
      }
    }
    this.respListenerQueue.push({
      fn,
      filter
    })
    return this.respListenerQueue.length - 1
  }

  /**
   * 取消注册响应监听
   * @param id {Number} 注册时返回的
   */
  unregisterListener(id) {
    if (typeof id !== 'number' || id < 0 || id > this.respListenerQueue.length - 1) {
      throw new RangeError('out of bound')
    }
    this.respListenerQueue[id] = null
  }

  parseResp() {
    const r = parseData(new Uint8Array(this.respBuffer.buffer, 0, this.respLength))
    switch (r.err) {
      case PARSE_CODE.LACK_DATA:
        log.info('parse: lack data')
        return
      case PARSE_CODE.UNKNOW_TYPE:
      case PARSE_CODE.CRC_DISS:
        log.warn('parse: fatal error')
        // 清空缓冲区
        this.respLength = 0
        return
      case PARSE_CODE.OK:
        this.respLength = 0
        break
      case PARSE_CODE.OVER_DATA:
        // 截断指令长度
        this.respLength -= r.resp.length
        this.respBuffer.copyWithin(r.resp.length, 0, this.respLength)
        break
      default:
        log.error('parse: no possible')
    }
    // 监听回调
    for (let listener of this.respListenerQueue) {
      // 取消注册监听后，会产生‘洞’，跳过
      if (listener) {
        // 是否过滤
        if (listener.filter) {
          if (listener.filter(r.resp)) {
            listener.fn(r.resp)
          }
        } else {
          listener.fn(r.resp)
        }
      }
    }
    // 弱回调
    for (var i = 0; i < this.respCb.length; i++) {
      var cb = this.respCb[i]
      if (cb.head === r.resp.head) {
        cb.cb(r.resp)
        break
      }
    }
    // 发现回调，将该回调和之前的回调都出列
    if (i < this.respCb.length) {
      this.respCb.splice(0, i + 1)
    }
  }
}

module.exports = SP_cmdControl
