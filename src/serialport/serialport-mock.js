const sp_pool = [
  {
    comName: 'wchusbserial01',
    manufacturer: 'wch.cn'
  },
  {
    comName: 'wchusbserial02',
    manufacturer: 'wch.cn'
  },
  {
    comName: 'wchusbserial03',
    manufacturer: 'wch.cn'
  }
]
const chipResp = {
  '0xFB02': new Uint8Array([0xFB,0x02, 0x01, 0x06, 0xC3, 0xA8, 0xC3, 0xA8, 0xC7, 0xF2, 0x77, 0xA4]),
  '0xB000': new Uint8Array([0xB0, 0x00, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf6, 0x36]),

  // 文件传输
  '0x3061': function() {
    return new Uint8Array([0x48, 0x4A, 0x00, 0x00, 0x00, 0x00, 0x5D, 0x96])
  },
  '0x424C': function(index) {
    // 按协议分段序号应该是变的，我懒得传了，反正没校验
    return new Uint8Array([0x48, 0x4A, 0x00, 0x00, 0x01, 0x00, 0xCD, 0x97])
  },
  '0x4E52': function() {
    return new Uint8Array([0x48, 0x4A, 0x00, 0x00, 0x00, 0x00, 0x5D, 0x96])
  }
}

class SerialPort {
  constructor(comName, opt) {
    this.dataListenerQ = []
  }

  on(event, listener) {
    // console.log('mock serialport event:', event)
    if (event === 'data') {
      this.dataListenerQ.push(listener)
    }
  }

  write(buffer) {
    // console.log('mock serialport write')
    let head = buffer.readUInt16BE(0)
    head = '0x' + head.toString(16).toUpperCase()

    let r = chipResp[head]
    if (r) {
      if (typeof r === 'function') {
        r = r()
      }
      r = Buffer.from(r)
      setTimeout(() => {
        for (let listener of this.dataListenerQ) {
          listener(r)
        }
      }, 30)
    }
  }
}

SerialPort.list = function() {
  // 每10秒变换一次
  const minInterval = 10
  var lastDate = Date.now()
  var lastSpList = sp_pool.slice(0, Math.floor(Math.random() * (sp_pool.length + 1)))
  return function(cb) {
    var nowDate = Date.now()
    if (nowDate - lastDate > minInterval * 1000) {
      lastDate = nowDate
      lastSpList = sp_pool.slice(0, Math.floor(Math.random() * (sp_pool.length + 1)))
    }
    cb(null, lastSpList)
  }
}()

module.exports = SerialPort
