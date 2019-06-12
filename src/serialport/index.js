process.env.DEBUG='serialport:*'

const SP = require('./sp.js')
const { req } = require('./plugin/cmd.js')
const path = require('path')

const sp = new SP()
console.log(sp);
const ports = []
let defaultPort = null
document.getElementById('scan').onclick = function() {
  console.log('scan')
  sp.scanInfinite(function(err, port) {
    if (err) {
      console.log(err)
    } else {
      console.log(port)
      ports.push(port)
    }
  })
}
document.getElementById('stop-scan').onclick = function() {
  console.log('stop scan')

  sp.stopScan()
}
document.getElementById('active-port').onclick = function() {
  console.log('active port')

  defaultPort = sp.activePort(ports[0], function() {
    defaultPort = null
    ports.shift()
  })
}


document.getElementById('get-profile').onclick = function() {
  // defaultPort.sendReq(req.moduleColorBatch(2))
  // setTimeout(()=> {
  //   defaultPort.sendReq({
  //     req: req.moduleSingleColor(1, 1),
  //     cb: function(resp) {
  //       console.log('回调', resp)
  //     },
  //     highPriority: true
  //   })
  // }, 2000)

  defaultPort.sendReq({
    req: req.moduleArmJoint(1),
    cb: (resq) => {
      console.log(resq);
    },
    highPriority: true
  })

}

document.getElementById('module-view').onclick = function() {
  defaultPort.sendReq(req.moduleView())
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
  listenerId = defaultPort.registerListener(function(resp) {
    console.log(resp)
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
    onBegin: () => {
      console.log('开始了');
    },
    onProgress: p => {
      console.log(p, '进度啊');
    },
    onEnd: () => {
      console.log('结束了');
      defaultPort.switchPlugin(defaultPort.ccPlugin)
    },
    onError: () => {
      defaultPort.switchPlugin(defaultPort.ccPlugin)
    }
  })
}
