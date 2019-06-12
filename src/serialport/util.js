const log = require('loglevel').getLogger('serialport')

exports.typedArray2HexArray = function(target) {
  if (target instanceof Uint8Array) {
    const res = new Array(target.length)
    for (var i = 0; i < target.length; i++) {
      res[i] = target[i] < 17 ? '0x0' + target[i].toString(16) : '0x' + target[i].toString(16)
    }
    return res
  } else {
    log.log('only Uint8Array be converted')
    return target
  }
}
