class SPManager {
  constructor() {
    this.scanOptDefault = {
      interval: 200,
      timeout: 30000
    }

    this.scanOpt = null
    this.scanCB = null

    this.scantask = null
    this.scanWatchDog = null

    this.ports = []
    this.comPort = null
  }

  scan(opt, callback) {
    if(this.scanTask) {

    }
  }

  scanInfinite(callback) {
    if(this.scanTask) {
      console.log('scanning')
      return
    }
    const scannedSP = []
    const _this = this

    this.scanCB = callback

    this.scanTask = setInterval(function() {

    })
  }
}
