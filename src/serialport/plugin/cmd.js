const crc = require('crc')

const CMD_TYPE = {
  GET_PROFILE: 0xFB02,
  SET_PROFILE: 0xFB03,

  SET_ARM_JOINT: 0xB702,
  SET_WAIST_JOINT: 0xB602,
  SET_DRIVER_TEST: 0xB102,
  SET_DRIVER_POLAR: 0xB202,
  SET_DRIVER_COLOR: 0xB1ED,
  SET_LIGHT: 0xB0ED,
  SET_ARM_JOINT_BATCH: 0x0206,
  SET_WAIST_JOINT_BATCH: 0x0306,

  MODULE_VIEW: 0xB000,
  MODULE_MASTER_CONTROL: 0xB010,
  MODULE_BATTERY: 0xB001,
  MODULE_DRIVER: 0xB002,
  MODULE_COLOR: 0xB003,
  MODULE_IR: 0xB004,
  MODULE_BEEP: 0x0406,
  MODULE_TOUCH: 0xB802,
  MODULE_ARM_JOINT: 0xB502,
  MODULE_WAIST_JOINT: 0xB402,
  MODULE_WAIST_JOINT_BATCH: 0x0906,
  MODULE_ARM_JOINT_BATCH: 0x0a06,
  MODULE_BATTERY_BATCH: 0x0b06,
  MODULE_DRIVER_POSITION_BATCH: 0x0c06,
  MOTOR_POLORITY: 0xB302,
  MODULE_DRIVER_RESET: 0xB902,
  MODULE_IR_BATCH: 0x0706,
  MODULE_COLOR_BATCH: 0x0606,
  MODULE_TOUCH_BATCH: 0x0806,

  FIRMWARE_UPGRADE_PREPARE: 0xFF0E,
  FIRMWARE_VERSION_GET: 0xFFEE,

  FILE_TRANSFER_START: 0x3061,
  FILE_TRANSFER_DATA: 0x424c,
  FILE_TRANSFER_END: 0x4e52,

  ENV_SWITCH_TO_LUA: 0xC004,

  FIRMWARE_VERSION_GET_BATTERY: 0xfbee, // 获取指定电池球固件版本号
  FIRMWARE_UPGRADE_PREPARE_BATTERY: 0xfb0e, // 准备指定电池球升级
  FIRMWARE_VERSION_GET_DRIVER: 0xfcee, // 获取指定驱动球固件版本号
  FIRMWARE_UPGRADE_PREPARE_DRIVER: 0xfc0e, // 准备指定驱动球升级
  FIRMWARE_VERSION_GET_INFRARED: 0xfeee, //  获取指定红外球固件版本号
  FIRMWARE_UPGRADE_PREPARE_INFRARED: 0xfe0e, // 准备指定红外球升级
  FIRMWARE_VERSION_GET_COLOR: 0xfdee, // 获取指定颜色球固件版本号
  FIRMWARE_UPGRADE_PREPARE_COLOR: 0xfd0e, // 准备指定颜色球升级
  FIRMWARE_VERSION_GET_TOUCH: 0xfaee, // 获取指定触碰球固件版本号
  FIRMWARE_UPGRADE_PREPARE_TOUCH: 0xfa0e, // 准备指定触碰球升级
  FIRMWARE_VERSION_GET_WAIST: 0xf9ee, // 获取水平关节球固件版本号
  FIRMWARE_UPGRADE_PREPARE_WAIST: 0xf90e, // 准备指定水平关节升级
  FIRMWARE_VERSION_GET_ARM: 0xf8ee, // 获取摇摆关节球固件版本号
  FIRMWARE_UPGRADE_PREPARE_ARM: 0xf80e, // 准备指定摇摆关节球固件升级
}

class ReqBase {
  constructor(head) {
    this.constructor.prototype.head = head
    // 帧头。固定值
    this.constructor.prototype.headFrame = null
    // 帧体
    this.bodyFrame = null
    // 帧头 + 帧体。方便计算crc和生成完整帧
    this.mutableFrame = null
    // 帧缓存
    this.constructor.prototype.cachedReq = null
  }

  genReq() {
    this.prepareHeadFrame()
    this.prepareBodyFrame()
    // 如果没有帧体，只有帧头，那么这个帧是不会变的，可以缓存起来
    if (!this.bodyFrame) {
      this.mutableFrame = this.headFrame
      return this.getCachedReq()
    } else {
      this.mutableFrame = new Uint8Array(2 + this.bodyFrame.length)
      this.mutableFrame.set(this.headFrame)
      this.mutableFrame.set(this.bodyFrame, 2)
      // 组合帧
      var req = new Uint8Array(4 + this.bodyFrame.length)
      req.set(this.mutableFrame)
      req.set(this.calcCRC(), this.mutableFrame.length)
      return req
    }
  }

  // 计算帧头。帧头是固定的，计算之后保存下来就好了
  prepareHeadFrame() {
    if (!this.headFrame) {
      this.constructor.prototype.headFrame = Uint8Array.of(this.head >> 8, this.head)
    }
    return this.headFrame
  }

  // 计算帧体。需要重写
  prepareBodyFrame() {
    // please override to construct `this.bodyFrame`
    return this.bodyFrame
  }

  // 计算crc校验码
  calcCRC() {
    const r = crc.crc16modbus(this.mutableFrame)
    return Uint8Array.of(r >> 8, r)
  }

  // 缓存帧。对于没有帧体的固定命令很有效
  getCachedReq() {
    if (!this.cachedReq) {
      const req = new Uint8Array(4)
      req.set(this.headFrame)
      req.set(this.calcCRC(), 2)
      // 缓存起来
      return this.constructor.prototype.cachedReq = req
    }
    return this.cachedReq
  }
}

/** 响应基类，只做最基本的crc检验
 * @discuss `parse`阶段结束后，其实可以把`this.data`释放掉。无论解析成功或失败，都不需要了。
 * 但我想，是不是这整个响应实例都没用了？如果我连实例也用不上，那就无需考虑`this.data`的垃圾回收了
 * 还是释放掉吧，并不知道将来`this`会如何
 */
class RespBase {
  constructor(data, l) {
    this.data = data
    // 指令长度。0代表变长
    this.length = l || 0
  }
  /** 构造实例时，并不会解析（无法获得正确的属性值），需要parse后才能正常使用该实例
   */
  parse() {
    // 检测指令长度
    if ((this.length > 0 && this.data.length < this.length) || this.data.length < 4) {
      this.data = null
      return PARSE_CODE.LACK_DATA
    }
    const err = this.parseBody()
    // 过短提前返回
    if (err === PARSE_CODE.LACK_DATA) {
      this.data = null
      return PARSE_CODE.LACK_DATA
    }
    this.head = (this.data[0] << 8) + this.data[1]
    // 检测crc
    if (!this.checkCRC()) {
      this.data = null
      return PARSE_CODE.CRC_DISS
    }
    this.data = null
    return err
  }

  /**子类重写时需要注意
   * 这里需要检测指令长度，过长或过短。变长指令需要正确设置指令长度，crc计算依赖对长度的计算
   */
  parseBody() {
    this.length = this.data.length
    return PARSE_CODE.OK
  }
  /**
   * 校验crc
   */
  checkCRC() {
    const frame = new Uint8Array(this.data.buffer, 0, this.length - 2)
    const r = crc.crc16modbus(frame)
    return (this.data[this.length - 2] << 8) + this.data[this.length - 1] === r
  }
}

/**
 * --------------- 查询主控昵称和颜色指令
 */
class ReqGetProfile extends ReqBase {
  constructor() {
    super(CMD_TYPE.GET_PROFILE)
  }
}
// 这是个变长指令，构造方法无需重写。为了做属性声明，我们还是写下
class RespGetProfile extends RespBase {
  constructor(data) {
    super(data, 0)

    this.color = null
    this.nickname = null
  }
  parseBody() {
    if (this.data.length < 6) {
      return PARSE_CODE.LACK_DATA
    }
    this.length = this.data[3] + 6
    if (this.data.length < this.length) {
      return PARSE_CODE.LACK_DATA
    }
    this.color = this.data[2]
    this.nickname = 'todo'
    if (this.data.length === this.length) {
      return PARSE_CODE.OK
    } else {
      return PARSE_CODE.OVER_DATA
    }
  }
}

/**
 * ---------------- 设置主控昵称和颜色指令
 */
class ReqSetProfile extends ReqBase {
  constructor(color, nickname) {
    super(CMD_TYPE.SET_PROFILE)

    this.color = color
    this.nickname = nickname
  }

  prepareBodyFrame() {

    // please override to construct `this.bodyFrame`
    return this.bodyFrame = Uint8Array.of(this.color, this.nickname)
  }
}
class RespSetProfile extends RespBase {

}

/**
 * ---------------- 查询在线模块数量
 */
class ReqModuleView extends ReqBase {
  constructor() {
    super(CMD_TYPE.MODULE_VIEW)
  }
}
class RespModuleView extends RespBase {
  constructor(data) {
    super(data, 0)

    // 模块类型数量
    this.moduleCount = 0
    // 各种模块数量，是个数组
    this.moduleView = null
  }
  parseBody() {
    if (this.data.length < 5) {
      return PARSE_CODE.LACK_DATA
    }
    // parse module category
    this.moduleCount = this.data[2]
    // get length
    this.length = this.moduleCount + 5
    if (this.data.length < this.length) {
      return PARSE_CODE.LACK_DATA
    }
    // parse each module count
    this.moduleView = []
    for (var i = 0; i < this.moduleCount; i++) {
      this.moduleView[i] = this.data[3 + i]
    }
    if (this.data.length === this.length) {
      return PARSE_CODE.OK
    } else {
      return PARSE_CODE.OVER_DATA
    }
  }
}

  /**
   * ------------------ 设置蜂鸣器
   */
   class ReqSetModuleBeep extends ReqBase {
     constructor(Beep) {
       super(CMD_TYPE.MODULE_BEEP)

       this.Beep = Beep
     }

     prepareBodyFrame() {
       return this.bodyFrame = Uint8Array.of(this.Beep)
     }
   }

  /**
   * ------------------ env switch to lua
   */

   class ReqEnvSwitchToLua extends ReqBase {
     constructor(Beep) {
       super(CMD_TYPE.ENV_SWITCH_TO_LUA)
     }
   }

  /**
   * ------------------ 设置灯光
   */
   class ReqSetLight extends ReqBase {
     constructor(module, mode, color) {
       super(CMD_TYPE.SET_LIGHT)

       this.module = Math.min(0x03, Math.max(0x01, module))
       this.mode = Math.min(0x04, Math.max(0x01, mode));
       this.color = Math.min(0x08, Math.max(0x01, color))
     }

     prepareBodyFrame() {
       return this.bodyFrame = Uint8Array.of(this.module, this.mode, this.color)
     }
   }

/**
 * ---------------- 查询某模块状态。基类。只能查询单个
 */
class ReqModuleSingle extends ReqBase {
  constructor(cmd_type, index) {
    super(cmd_type)
    if (typeof index !== 'number' || index < 1 || index > 15) {
      throw new TypeError('invalid argument: index')
    }
    this.index = index
  }
  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.index)
  }
}

/**
 * ---------------- 设置某模块状态。基类。设置单个
 */
 class ReqSetModuleSingle extends ReqBase {
   constructor(cmd_type, index, value1, value2) {
     super(cmd_type)
     this.type = cmd_type
     if (typeof index !== 'number' || index < 1 || index > 15) {
       throw new TypeError('invalid argument: index')
     }
     this.index = index
     switch (cmd_type) {
       case CMD_TYPE.SET_ARM_JOINT:
       case CMD_TYPE.SET_WAIST_JOINT:
        this.value1 = Math.min(180, Math.max(0, value1))
         break;
       case CMD_TYPE.SET_DRIVER_TEST:
        this.value1 = Math.min(100, Math.max(-100, value1))
         break;
       case CMD_TYPE.SET_DRIVER_POLAR:
        this.value1 = Math.ceil(Math.min(1, Math.max(0, value1)))
         break;
       case CMD_TYPE.SET_DRIVER_COLOR:
        this.value1 = Math.ceil(Math.min(4, Math.max(1, value1)))
        this.value2 = Math.ceil(Math.min(8, Math.max(1, value2)))
        console.log(this.value1);
        console.log(this.value2);
         break;
       default:
        this.value1 = 0
         break;
     }

   }

   prepareBodyFrame() {
     switch (this.type) {
       case CMD_TYPE.SET_ARM_JOINT:
       case CMD_TYPE.SET_WAIST_JOINT:
       case CMD_TYPE.SET_DRIVER_POLAR:
        return this.bodyFrame = Uint8Array.of(this.index, this.value1)
         break;
       case CMD_TYPE.SET_DRIVER_TEST:
        return this.bodyFrame = Int8Array.of(this.index, this.value1)
         break;
       case CMD_TYPE.SET_DRIVER_COLOR:
        return this.bodyFrame = Uint8Array.of(this.index, this.value1, this.value2)
         break;
       default:
        return null
         break
     }
   }
 }

/**
 * ------------------ 查询摇摆关节球角度
 */
 class ReqModuleArmJoint extends ReqModuleSingle {
   constructor(index) {
     super(CMD_TYPE.MODULE_ARM_JOINT, index)
   }
 }
 class RespModuleArmJoint extends RespBase {
   constructor(data) {
     //定长指令
     super(data, 5)
     this.angle = null
   }
   parseBody() {
     this.angle = this.data[2]
     if (this.data.length === this.length) {
       return PARSE_CODE.OK
     } else {
       return PARSE_CODE.OVER_DATA
     }
   }
 }

 /*
  *  批量设置摇摆关节球
 */
 class ReqSetArmJointBatch extends ReqBase {
   constructor(value) {
     super(CMD_TYPE.SET_ARM_JOINT_BATCH)
     this.value = value
   }

   prepareBodyFrame() {
     return this.bodyFrame = Uint8Array.of(this.value)
   }
 }
 /*
  *  批量设置水平关节球
 */
 class ReqSetWaistJointBatch extends ReqBase {
   constructor(value) {
     super(CMD_TYPE.SET_WAIST_JOINT_BATCH)
     this.value = value
   }

   prepareBodyFrame() {
     return this.bodyFrame = Uint8Array.of(this.value)
   }
 }


 /**
  * ------------------ 设置摇摆关节球角度
  */
  class ReqSetModuleArmJoint extends ReqSetModuleSingle {
    constructor(index, value) {
      super(CMD_TYPE.SET_ARM_JOINT, index, value)
    }
  }
  class RespSetModuleArmJoint extends RespBase {
    constructor(data) {
      super(data, 5)
    }
    parseBody() {
      if (this.data.length === this.length) {
        return PARSE_CODE.OK
      } else {
        return PARSE_CODE.OVER_DATA
      }
    }
  }

/**
 * ------------------ 查询水平关节球角度
 */
 class ReqModuleWaistJoint extends ReqModuleSingle {
   constructor(index) {
     super(CMD_TYPE.MODULE_WAIST_JOINT, index)
   }
 }
 class RespModuleWaistJoint extends RespBase {
   constructor(data) {
     //定长指令
     super(data, 5)
     this.angle = null
   }
   parseBody() {
     this.angle = this.data[2]
     if (this.data.length === this.length) {
       return PARSE_CODE.OK
     } else {
       return PARSE_CODE.OVER_DATA
     }
   }
 }

 /**
  * ------------------ 设置水平关节球角度
  */
  class ReqSetModuleWaistJoint extends ReqSetModuleSingle {
    constructor(index, value) {
      super(CMD_TYPE.SET_WAIST_JOINT, index, value)
    }
  }
  class RespSetModuleWaistJoint extends RespBase {
    constructor(data) {
      super(data, 5)
    }
    parseBody() {
      if (this.data.length === this.length) {
        return PARSE_CODE.OK
      } else {
        return PARSE_CODE.OVER_DATA
      }
    }
  }


  /**
   * ------------------ 查询所有水平关节球角度
   */
   class ReqModuleWaistJointBatch extends ReqBase {
     constructor() {
       super(CMD_TYPE.MODULE_WAIST_JOINT_BATCH)
     }
   }
   class RespModuleWaistJointBatch extends RespBase {
     constructor(data) {
       super(data, 19)
       this.angles = null
     }
     parseBody() {
       this.angles = Array.prototype.slice.call(this.data, 2, -2)
       if (this.data.length === this.length) {
         return PARSE_CODE.OK
       } else {
         return PARSE_CODE.OVER_DATA
       }
     }
   }

  /**
   * ------------------ 查询所有摇摆关节球角度
   */
   class ReqModuleArmJointBatch extends ReqBase {
     constructor() {
       super(CMD_TYPE.MODULE_ARM_JOINT_BATCH)
     }
   }
   class RespModuleArmJointBatch extends RespBase {
     constructor(data) {
       super(data, 19)
       this.angles = null
     }
     parseBody() {
       this.angles = Array.prototype.slice.call(this.data, 2, -2)
       if (this.data.length === this.length) {
         return PARSE_CODE.OK
       } else {
         return PARSE_CODE.OVER_DATA
       }
     }
   }

  /**
   * ------------------ 查询主控
   */
   class ReqModuleMaster extends ReqBase {
     constructor() {
       super(CMD_TYPE.MODULE_MASTER_CONTROL)
     }
   }
   class RespModuleMaster extends RespBase {
     constructor(data) {
       super(data, 10)
       this.pitchAngle = null,
       this.rollAngle = null,
       this.yawAngle = null
     }
     parseBody() {
       this.pitchAngle = bytes2ToInt(Array.prototype.slice.call(this.data, 2, 4))
       this.rollAngle = bytes2ToInt(Array.prototype.slice.call(this.data, 4, 6))
       this.yawAngle = bytes2ToInt(Array.prototype.slice.call(this.data, 6, 8))
       if (this.data.length === this.length) {
         return PARSE_CODE.OK
       } else {
         return PARSE_CODE.OVER_DATA
       }
     }
   }

  /**
   * ---------------- 查询电池参数
   */
  class ReqModuleBattery extends ReqModuleSingle {
    constructor(index) {
      // 255是查询总电量。为了通过参数检测，先当作1使用
      if (index === 255) {
        var wholeQuantity = true
        index = 1
      }
      super(CMD_TYPE.MODULE_BATTERY, index)
      if (wholeQuantity) {
        this.index = 255
      }
    }
  }
  class RespModuleBattery extends RespBase {
    constructor(data) {
      // 定长指令
      super(data, 6)

      this.index = null
      this.quantity = null
    }
    parseBody() {
      // 定长指令无需检测`PARSE_CODE.LACK_DATA`
      this.index = this.data[2]
      this.quantity = this.data[3]
      if (this.data.length === this.length) {
        return PARSE_CODE.OK
      } else {
        return PARSE_CODE.OVER_DATA
      }
    }
  }

  /**
   * ---------------- 查询所有电池电量
   */
  class ReqModuleBatteryBatch extends ReqBase {
    constructor() {
      super(CMD_TYPE.MODULE_BATTERY_BATCH)
    }
  }
  class RespModuleBatteryBatch extends RespBase {
    constructor(data) {
      super(data, 19)

      this.electricitys = null
    }
    parseBody() {
      this.electricitys = Array.prototype.slice.call(this.data, 2, -2)
      if (this.data.length === this.length) {
        return PARSE_CODE.OK
      } else {
        return PARSE_CODE.OVER_DATA
      }
    }
  }

  /**
   * ------------------ 查询驱动球参数
   */
  class ReqModuleDriver extends ReqModuleSingle {
    constructor(index, value) {
      super(CMD_TYPE.MODULE_DRIVER, index, value)
    }
  }
  class RespModuleDriver extends RespBase {
    constructor(data) {
      // 定长指令
      super(data, 10)

      this.index = null
      this.speed = null
      this.angle = null
    }
    parseBody() {
      // 定长指令无需检测`PARSE_CODE.LACK_DATA`
      this.index = this.data[2]
      // 有符号数
      this.speed = new Int8Array(this.data.buffer, 3, 1)[0]
      this.angle = new Int32Array(this.data.buffer, 4, 4)[0]
      if (this.data.length === this.length) {
        return PARSE_CODE.OK
      } else {
        return PARSE_CODE.OVER_DATA
      }
    }
  }

  /**
   * ------------------ 查询所有驱动球位置
   */
  class ReqModuleDriverPositionBatch extends ReqBase {
    constructor() {
      super(CMD_TYPE.MODULE_DRIVER_POSITION_BATCH)
    }
  }
  class RespModuleDriverPositionBatch extends RespBase {
    constructor(data) {
      super(data, 64)

      this.angles = null
    }
    parseBody() {
      // 定长指令无需检测`PARSE_CODE.LACK_DATA`
      let data = Array.prototype.slice.call(this.data, 2, -2)

      var res = [];
      for (var i = 0; i < data.length; i+=4) {
        if (data[i] === 0xff && data[i + 1] === 0xff &&
          data[i + 2] === 0xff && data[i + 3] === 0xff) {
          res.push(0)
        } else {
          var n = Number((bytes4ToInt(data.slice(i, i + 4)) / 1600 * 360).toFixed(1));  // angles
          res.push(n)
        }
      }
      this.angles = res

      if (this.data.length === this.length) {
        return PARSE_CODE.OK
      } else {
        return PARSE_CODE.OVER_DATA
      }
    }
  }

/**
 * ------------------ 测试驱动球
 */
 class ReqSetModuleDriverTest extends ReqSetModuleSingle {
   constructor(index, value) {
     super(CMD_TYPE.SET_DRIVER_TEST, index, value)
   }
 }
 class RespSetModuleDriverTest extends RespBase {
   constructor(data) {
     super(data, 6)
     this.index = null
     this.status = null
   }
   parseBody() {
     this.index = this.data[2]
     this.status = this.data[3]
     if (this.data.length === this.length) {
       return PARSE_CODE.OK
     } else {
       return PARSE_CODE.OVER_DATA
     }
   }
 }

/**
 * ------------------ 驱动球极性设置
 */
 class ReqSetModuleDriverPolar extends ReqSetModuleSingle {
   constructor(index, value) {
     super(CMD_TYPE.SET_DRIVER_POLAR, index, value)
   }
 }
 class RespSetModuleDriverPolar extends RespBase {
   constructor(data) {
     super(data, 6)
     this.index = null
     this.polar = null
   }
   parseBody() {
     this.index = this.data[2]
     this.polar = this.data[3]
     if (this.data.length === this.length) {
       return PARSE_CODE.OK
     } else {
       return PARSE_CODE.OVER_DATA
     }
   }
 }

/**
 * ------------------ 驱动球reset
 */
 class ReqSetModuleDriverReset extends ReqModuleSingle {
   constructor(index) {
     index = Math.min(0x0f, Math.max(0x01, index))
     super(CMD_TYPE.MODULE_DRIVER_RESET, index)
   }
 }
 // class RespSetModuleDriverReset extends RespBase {
 //   constructor(data) {
 //     super(data, 6)
 //     this.index = null
 //     this.polar = null
 //   }
 //   parseBody() {
 //     this.index = this.data[2]
 //     this.polar = this.data[3]
 //     if (this.data.length === this.length) {
 //       return PARSE_CODE.OK
 //     } else {
 //       return PARSE_CODE.OVER_DATA
 //     }
 //   }
 // }

/**
 * ------------------ 单个驱动球灯光控制指令
 */
 class ReqSetModuleDriverColor extends ReqSetModuleSingle {
   constructor(index, value1, value2) {
     super(CMD_TYPE.SET_DRIVER_COLOR, index, value1, value2)
   }
 }
 // 该指令没有响应
 // class RespSetModuleDriverColor extends RespBase {
 //   constructor(data) {
 //     super(data, 6)
 //     this.index = null
 //     this.polar = null
 //   }
 //   parseBody() {
 //     this.index = this.data[2]
 //     this.polar = this.data[3]
 //     if (this.data.length === this.length) {
 //       return PARSE_CODE.OK
 //     } else {
 //       return PARSE_CODE.OVER_DATA
 //     }
 //   }
 // }

/**
 * ------------------- 查询颜色传感器参数
 */
class ReqModuleColor extends ReqModuleSingle {
  constructor(index, mode) {
    super(CMD_TYPE.MODULE_COLOR, index)
    if (typeof mode !== 'number' || mode < 1 || mode > 3) {
      throw new TypeError('invalid argument: mode')
    }
    this.mode = mode
  }
  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.index, this.mode)
  }
}
class RespModuleColor extends RespBase {
  constructor(data) {
    // 定长指令
    super(data, 8)

    this.index = null
    this.mode = null
    this.unionData = null
  }
  parseBody() {
    // 定长指令无需检测`PARSE_CODE.LACK_DATA`
    this.index = this.data[2]
    this.mode = this.data[3]
    this.unionData = new Uint16Array(this.data.buffer, 4, 2)[0]
    if (this.data.length === this.length) {
      return PARSE_CODE.OK
    } else {
      return PARSE_CODE.OVER_DATA
    }
  }
}

/**
 * ---------------- 查询所有颜色
 */
class ReqModuleColorBatch extends ReqBase {
  constructor(mode) {
    super(CMD_TYPE.MODULE_COLOR_BATCH)
    this.mode =  Math.min(0x03, Math.max(0x01, mode))
  }
  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.mode)
  }
}
class RespModuleColorBatch extends RespBase {
  constructor(data) {
    super(data, 35)

    this.module = null
    this.color = null
  }
  parseBody() {
    this.module = this.data[2]
    let data = this.data.slice(3, 3 + 15 * 2); // sub array [3, 33)
    let arr = [];
    for (var i = 0; i < data.length / 2; i += 2) {
      var a = [];
      a.push(data[i]);
      a.push(data[i + 1]);
      arr.push(bytes2ToInt(a));
    }
    this.color = arr
    if (this.data.length === this.length) {
      return PARSE_CODE.OK
    } else {
      return PARSE_CODE.OVER_DATA
    }
  }
}

/**
 * ------------------ 查询红外传感器参数
 */
class ReqModuleIR extends ReqModuleSingle {
  constructor(index) {
    super(CMD_TYPE.MODULE_IR, index)
  }
}
class RespModuleIR extends RespBase {
  constructor(data) {
    // 定长指令
    super(data, 6)

    this.index = null
    this.distance = null
  }
  parseBody() {
    // 定长指令无需检测`PARSE_CODE.LACK_DATA`
    this.index = this.data[2]
    this.distance = this.data[3]
    if (this.data.length === this.length) {
      return PARSE_CODE.OK
    } else {
      return PARSE_CODE.OVER_DATA
    }
  }
}

/**
 * ---------------- 查询所有红外
 */
class ReqModuleIRBatch extends ReqBase {
  constructor(mode) {
    super(CMD_TYPE.MODULE_IR_BATCH)
  }
}
class RespModuleIRBatch extends RespBase {
  constructor(data) {
    super(data, 19)

    this.distance = null
  }
  parseBody() {
    this.distance = Array.prototype.slice.call(this.data, 2, -2)
    if (this.data.length === this.length) {
      return PARSE_CODE.OK
    } else {
      return PARSE_CODE.OVER_DATA
    }
  }
}

/**
 * ------------------ 查询触碰传感器参数
 */
class ReqModuleTouch extends ReqModuleSingle {
  constructor(index) {
    super(CMD_TYPE.MODULE_TOUCH, index)
  }
}
class RespModuleTouch extends RespBase {
  constructor(data) {
    // 定长指令
    super(data, 5)

    this.isTouch = null
  }
  parseBody() {
    this.isTouch = this.data[2] ? true : false
    if (this.data.length === this.length) {
      return PARSE_CODE.OK
    } else {
      return PARSE_CODE.OVER_DATA
    }
  }
}

/**
 * ---------------- 查询所有触碰球
 */
class ReqModuleTouchBatch extends ReqBase {
  constructor(mode) {
    super(CMD_TYPE.MODULE_TOUCH_BATCH)
  }
}
class RespModuleTouchBatch extends RespBase {
  constructor(data) {
    super(data, 19)

    this.arr = null
  }
  parseBody() {
    this.arr = Array.prototype.slice.call(this.data, 2, 17)
    if (this.data.length === this.length) {
      return PARSE_CODE.OK
    } else {
      return PARSE_CODE.OVER_DATA
    }
  }
}

/**
 * ------------------ 查询电机极性
 */
class ReqMotorPolarity extends ReqModuleSingle {
  constructor(index) {
    super(CMD_TYPE.MOTOR_POLORITY, index)
  }
}
class RespReqMotorPolarity extends RespBase {
  constructor(data) {
    // 定长指令
    super(data, 5)

    this.polarity = null
  }
  parseBody() {
    this.polarity = this.data[2]
    if (this.data.length === this.length) {
      return PARSE_CODE.OK
    } else {
      return PARSE_CODE.OVER_DATA
    }
  }
}

// 准备固件升级
class ReqFirmwareUpgradePrepare extends ReqBase {
  constructor(version) {
    super(CMD_TYPE.FIRMWARE_UPGRADE_PREPARE)
    this.version = version
  }

  prepareBodyFrame() {
    const uint16 = Uint16Array.of(this.version)
    const uint8Bytes = new Uint8Array(uint16.buffer)
    this.bodyFrame = uint8Bytes
    return uint8Bytes
  }
}

class RespFirmwareUpgradePrepare extends RespBase {

  constructor(data) {
    super(data, 5)
    this.code = null
  }

  parseBody() {
    if (this.data.length < 5) return PARSE_CODE.LACK_DATA

    this.code = this.data[2]
    if (this.code === 0x01) return PARSE_CODE.OK
    else return PARSE_CODE.UNKNOW_TYPE
  }
}
// 查询固件版本
class ReqFirmwareVersionGet extends ReqBase {
  constructor() {
    super(CMD_TYPE.FIRMWARE_VERSION_GET)
  }
}
class RespFirmwareVersionGet extends RespBase {
  constructor(data) {
    super(data, 6)
    this.version = null
  }

  parseBody() {
    if (this.data.length < 6) return PARSE_CODE.LACK_DATA

    this.version = (this.data[3] << 8) + this.data[2]
    return PARSE_CODE.OK
  }
}

// 准备文件传输
class ReqFileTransferStart extends ReqBase {
  constructor(chunkCount, dataLength) {
    super(CMD_TYPE.FILE_TRANSFER_START)
    this.chunkCount = intTo2Bytes(chunkCount)
    this.dataLength = intTo4Bytes(dataLength)
  }

  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.chunkCount, this.dataLength)
  }
}

// 文件传输
class ReqFileTransferData extends ReqBase {
  constructor(rawData, chunkSize, seqNumber) {
    super(CMD_TYPE.FILE_TRANSFER_DATA)
    this.rawData = rawData
    this.chunkSize =intTo4Bytes(chunkSize + 2)
    this.seqNumber = intTo2Bytes(seqNumber)
  }

  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.chunkSize, this.seqNumber, this.rawData)
  }
}

// 文件传输结束
class ReqFileTransferEnd extends ReqBase {
  constructor(totalChunk, totalLength) {
    super(CMD_TYPE.FILE_TRANSFER_END)
    this.totalChunk = intTo2Bytes(totalChunk)
    this.totalLength =intTo4Bytes(totalLength)
  }

  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.totalChunk, this.totalLength)
  }
}

class RespFileTransfer extends RespBase {
  constructor(data) {
    super(data, 8)
    this.success = false
  }

  parseBody() {
    if(this.data[2] === 0x00 && this.data[3] === 0x00) {
      this.success = true
    }
    if (this.data.length === this.length) {
      return PARSE_CODE.OK
    } else {
      return PARSE_CODE.OVER_DATA
    }
  }
}

// 单个模块固件升级
class ReqSingleModuleFirmwareVersionGetBattery extends ReqBase {
  constructor(seq) {
    super(CMD_TYPE.FIRMWARE_VERSION_GET_BATTERY);
    this.seq = seq;
  }

  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.seq);
  }
}
class ReqSingleModuleFirmwareVersionGetDriver extends ReqBase {
  constructor(seq) {
    super(CMD_TYPE.FIRMWARE_VERSION_GET_DRIVER);
    this.seq = seq;
  }

  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.seq);
  }
}
class ReqSingleModuleFirmwareVersionGetInfrared extends ReqBase {
  constructor(seq) {
    super(CMD_TYPE.FIRMWARE_VERSION_GET_INFRARED);
    this.seq = seq;
  }

  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.seq);
  }
}
class ReqSingleModuleFirmwareVersionGetColor extends ReqBase {
  constructor(seq) {
    super(CMD_TYPE.FIRMWARE_VERSION_GET_COLOR);
    this.seq = seq;
  }

  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.seq);
  }
}
class ReqSingleModuleFirmwareVersionGetTouch extends ReqBase {
  constructor(seq) {
    super(CMD_TYPE.FIRMWARE_VERSION_GET_TOUCH);
    this.seq = seq;
  }

  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.seq);
  }
}
class ReqSingleModuleFirmwareVersionGetWaist extends ReqBase {
  constructor(seq) {
    super(CMD_TYPE.FIRMWARE_VERSION_GET_WAIST);
    this.seq = seq;
  }

  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.seq);
  }
}
class ReqSingleModuleFirmwareVersionGetArm extends ReqBase {
  constructor(seq) {
    super(CMD_TYPE.FIRMWARE_VERSION_GET_ARM);
    this.seq = seq;
  }

  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.seq);
  }
}
class RespSingleModuleFirmwareVersionGet extends RespBase {
  constructor(data) {
    super(data, 2 + 1 + 2 + 2); // header 2bytes, seq 1byte, version 2bytes, crc16 2bytes
    this.seq = null;
    this.version = null;
  }

  parseBody() {
    this.seq = this.data[2];
    this.version = bytes2ToInt(Array.prototype.slice.call(this.data, 3, 5));

    if (this.data.length === this.length) {
      return PARSE_CODE.OK;
    } else {
      return PARSE_CODE.OVER_DATA;
    }
  }
}
class ReqSingleModuleFirmwareUpgradePrepareBattery extends ReqBase {
  constructor(seq) {
    super(CMD_TYPE.FIRMWARE_UPGRADE_PREPARE_BATTERY);
    this.seq = seq;
  }

  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.seq);
  }
}
class ReqSingleModuleFirmwareUpgradePrepareDriver extends ReqBase {
  constructor(seq) {
    super(CMD_TYPE.FIRMWARE_UPGRADE_PREPARE_DRIVER);
    this.seq = seq;
  }

  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.seq);
  }
}
class ReqSingleModuleFirmwareUpgradePrepareInfrared extends ReqBase {
  constructor(seq) {
    super(CMD_TYPE.FIRMWARE_UPGRADE_PREPARE_INFRARED);
    this.seq = seq;
  }

  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.seq);
  }
}
class ReqSingleModuleFirmwareUpgradePrepareColor extends ReqBase {
  constructor(seq) {
    super(CMD_TYPE.FIRMWARE_UPGRADE_PREPARE_COLOR);
    this.seq = seq;
  }

  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.seq);
  }
}
class ReqSingleModuleFirmwareUpgradePrepareTouch extends ReqBase {
  constructor(seq) {
    super(CMD_TYPE.FIRMWARE_UPGRADE_PREPARE_TOUCH);
    this.seq = seq;
  }

  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.seq);
  }
}
class ReqSingleModuleFirmwareUpgradePrepareWaist extends ReqBase {
  constructor(seq) {
    super(CMD_TYPE.FIRMWARE_UPGRADE_PREPARE_WAIST);
    this.seq = seq;
  }

  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.seq);
  }
}
class ReqSingleModuleFirmwareUpgradePrepareArm extends ReqBase {
  constructor(seq) {
    super(CMD_TYPE.FIRMWARE_UPGRADE_PREPARE_ARM);
    this.seq = seq;
  }

  prepareBodyFrame() {
    return this.bodyFrame = Uint8Array.of(this.seq);
  }
}
class ResqSingleModuleFirmwareUpgradePrepare extends RespBase {
  constructor(data) {
    super(data, 2 + 1 + 2); // header 2bytes, status 1byte, crc16 2bytes
    this.status = false;
  }

  parseBody() {
    this.status = this.data[2] === 0x01;

    if (this.data.length === this.length) {
      return PARSE_CODE.OK;
    } else {
      return PARSE_CODE.OVER_DATA;
    }
  }
}

const req = {
  getProfile: function() {
    return new ReqGetProfile()
  },
  setProfile: function(color, nickname) {
    // throw 'not supported yet'
    return new ReqSetProfile(color, nickname)
  },
  setLight: function(module, mode, color) {
    return new ReqSetLight(module, mode, color)
  },
  moduleView: function() {
    return new ReqModuleView()
  },
  moduleMaster: function() {
    return new ReqModuleMaster()
  },
  moduleArmJoint: function(index) {
    return new ReqModuleArmJoint(index)
  },
  moduleArmJointBatch: function() {
    return new ReqModuleArmJointBatch()
  },
  setArmJoint: function(index, value) {
    return new ReqSetModuleArmJoint(index, value)
  },
  setArmJointBatch: function(value) {
    return new ReqSetArmJointBatch(value)
  },
  moduleWaistJoint: function(index) {
    return new ReqModuleWaistJoint(index)
  },
  setWaistJoint: function(index, value) {
    return new ReqSetModuleWaistJoint(index, value)
  },
  setWaistJointBatch: function(value) {
    return new ReqSetWaistJointBatch(value)
  },
  moduleWaistJointBatch: function() {
    return new ReqModuleWaistJointBatch()
  },
  moduleSingleBattery: function(index) {
    return new ReqModuleBattery(index)
  },
  moduleBatteryBatch: function(index) {
    return new ReqModuleBatteryBatch(index)
  },
  moduleSingleDriver: function(index) {
    return new ReqModuleDriver(index)
  },
  moduleDriverPositionBatch: function() {
    return new ReqModuleDriverPositionBatch()
  },
  setSingleDriverTest: function(index, value) {
    return new ReqSetModuleDriverTest(index, value)
  },
  setSingleDriverPolar: function(index, value) {
    return new ReqSetModuleDriverPolar(index, value)
  },
  setSingleDriverColor: function(index, value1, value2) {
    return new ReqSetModuleDriverColor(index, value1, value2)
  },
  setSingleDriverReset: function(index) {
    return new ReqSetModuleDriverReset(index)
  },
  moduleSingleColor: function(index, mode) {
    return new ReqModuleColor(index, mode)
  },
  moduleColorBatch: function(mode) {
    return new ReqModuleColorBatch(mode)
  },
  moduleSingleIR: function(index) {
    return new ReqModuleIR(index)
  },
  moduleIRBatch: function() {
    return new ReqModuleIRBatch()
  },
  moduleBeep: function(Beep) {
    return new ReqSetModuleBeep(Beep)
  },
  moduleSingleTouch: function(index) {
    return new ReqModuleTouch(index)
  },
  moduleTouchBatch: function() {
    return new ReqModuleTouchBatch()
  },
  motorPolarity: function(index) {
    return new ReqMotorPolarity(index)
  },
  envSwitchToLua: function() {
    return new ReqEnvSwitchToLua()
  },
  firmwareUpgradePrepare: function(version) {
    return new ReqFirmwareUpgradePrepare(version)
  },
  firmwareVersionGet: function() {
    return new ReqFirmwareVersionGet()
  },
  fileTransferStart: function(chunkCount, dataLength) {
    return new ReqFileTransferStart(chunkCount, dataLength)
  },
  fileTransferData: function(rawData, chunkSize, seqNumber) {
    return new ReqFileTransferData(rawData, chunkSize, seqNumber)
  },
  fileTransferEnd: function(totalChunk, totalLength) {
    return new ReqFileTransferEnd(totalChunk, totalLength)
  },
  firmwareVersionGetBattery: function(seq) {
    return new ReqSingleModuleFirmwareVersionGetBattery(seq);
  },
  firmwareVersionGetDriver: function(seq) {
    return new ReqSingleModuleFirmwareVersionGetDriver(seq);
  },
  firmwareVersionGetInfrared: function(seq) {
    return new ReqSingleModuleFirmwareVersionGetInfrared(seq);
  },
  firmwareVersionGetColor: function(seq) {
    return new ReqSingleModuleFirmwareVersionGetColor(seq);
  },
  firmwareVersionGetTouch: function(seq) {
    return new ReqSingleModuleFirmwareVersionGetTouch(seq);
  },
  firmwareVersionGetWaist: function(seq) {
    return new ReqSingleModuleFirmwareVersionGetWaist(seq);
  },
  firmwareVersionGetArm: function(seq) {
    return new ReqSingleModuleFirmwareVersionGetArm(seq);
  },
  firmwareUpgradePrepareBattery: function(seq) {
    return new ReqSingleModuleFirmwareUpgradePrepareBattery(seq);
  },
  firmwareUpgradePrepareDriver: function(seq) {
    return new ReqSingleModuleFirmwareUpgradePrepareDriver(seq);
  },
  firmwareUpgradePrepareInfrared: function(seq) {
    return new ReqSingleModuleFirmwareUpgradePrepareInfrared(seq);
  },
  firmwareUpgradePrepareColor: function(seq) {
    return new ReqSingleModuleFirmwareUpgradePrepareColor(seq);
  },
  firmwareUpgradePrepareTouch: function(seq) {
    return new ReqSingleModuleFirmwareUpgradePrepareTouch(seq);
  },
  firmwareUpgradePrepareWaist: function(seq) {
    return new ReqSingleModuleFirmwareUpgradePrepareWaist(seq);
  },
  firmwareUpgradePrepareArm: function(seq) {
    return new ReqSingleModuleFirmwareUpgradePrepareArm(seq);
  }
}

// 解析返回码。一般负数是严重错误，需要清空缓冲区；正数可能需要再次解析
const PARSE_CODE = {
  // 未知指令类型
  UNKNOW_TYPE: -2,
  // crc校验错误
  CRC_DISS: -1,
  // ok
  OK: 0,
  // 数据不足以解析
  LACK_DATA: 1,
  // 解析成功，缓冲区有多余数据
  OVER_DATA: 2
}

// 这个没法前置声明。看来class定义不会前置
const PARSE_TABLE = {
  '0xFB02': RespGetProfile,
  '0xFB03': RespSetProfile,

  '0xB702': RespSetModuleArmJoint,
  '0xB602': RespSetModuleWaistJoint,
  '0xB102': RespSetModuleDriverTest,
  '0xB202': RespSetModuleDriverPolar,

  '0xB000': RespModuleView,
  '0xB010': RespModuleMaster,
  '0xB001': RespModuleBattery,
  '0xB002': RespModuleDriver,
  '0xB003': RespModuleColor,
  '0x0606': RespModuleColorBatch,
  '0xB004': RespModuleIR,
  '0x0706': RespModuleIRBatch,
  '0xB802': RespModuleTouch,
  '0xB302': RespReqMotorPolarity,
  '0xB502': RespModuleArmJoint,
  '0xB402': RespModuleWaistJoint,
  '0x0906': RespModuleWaistJointBatch,
  '0x0A06': RespModuleArmJointBatch,
  '0x0B06': RespModuleBatteryBatch,
  '0x0C06': RespModuleDriverPositionBatch,
  '0x0806': RespModuleTouchBatch,

  '0xFF0E': RespFirmwareUpgradePrepare,
  '0xFFEE': RespFirmwareVersionGet,

  '0x484a': RespFileTransfer,

  '0xFBEE': RespSingleModuleFirmwareVersionGet,
  '0xFCEE': RespSingleModuleFirmwareVersionGet,
  '0xFEEE': RespSingleModuleFirmwareVersionGet,
  '0xFDEE': RespSingleModuleFirmwareVersionGet,
  '0xFAEE': RespSingleModuleFirmwareVersionGet,
  '0xF9EE': RespSingleModuleFirmwareVersionGet,
  '0xF8EE': RespSingleModuleFirmwareVersionGet,

  '0xFB0E': ResqSingleModuleFirmwareUpgradePrepare,
  '0xFC0E': ResqSingleModuleFirmwareUpgradePrepare,
  '0xFE0E': ResqSingleModuleFirmwareUpgradePrepare,
  '0xFD0E': ResqSingleModuleFirmwareUpgradePrepare,
  '0xFA0E': ResqSingleModuleFirmwareUpgradePrepare,
  '0xF90E': ResqSingleModuleFirmwareUpgradePrepare,
  '0xF80E': ResqSingleModuleFirmwareUpgradePrepare,
}

function parseData(data) {
  if (data.length < 4) {
    // 指令长度无法解析，等待接收
    return {
      err: PARSE_CODE.LACK_DATA,
      resp: null
    }
  }
  const head_no = (data[0] << 8) + data[1]
  // 没有0开头的指令，懒得补齐位数了
  const head_hex = head_no.toString(16).toUpperCase()
  let head
  if (head_hex.length < 4) {
    head = '0x0' + head_hex
  } else {
    head = '0x' + head_hex
  }
  const RespParsed = PARSE_TABLE[head]
  if (!RespParsed) {
    // 无效指令，应当清空缓冲区
    return {
      err: PARSE_CODE.UNKNOW_TYPE,
      resp: null
    }
  }
  const resp = new RespParsed(data)
  const err = resp.parse()
  return {
    err,
    resp
  }
}

function bytes2ToInt(bytes) {
    // var result = bytes[0] & 0xff;
    // result |= (bytes[1] << 8) & 0xff00;
    var int8Array = new Int8Array(bytes);
    var bytes = int8Array.buffer.slice(-2);
    return new Int16Array(bytes)[0];
}

function bytes4ToInt(bytes) {
    // var result = bytes[0] & 0xff;
    // result |= (bytes[1] << 8) & 0xff00;
    // result |= (bytes[2] << 16) & 0xff0000;
    // result |= (bytes[3] << 24) & 0xff000000;
    var int8Array = new Int8Array(bytes);
    var bytes = int8Array.buffer.slice(-4);
    return new Int32Array(bytes)[0];
}

function intTo2Bytes(i) {
    var bytes = [];
    // low
    bytes.push((i & 0xff));
    // high
    bytes.push((i >> 8) & 0xff);
    return bytes;
}

function intTo4Bytes(l) {
    var bytes = [];
    bytes.push(l & 0xff);
    bytes.push((l >> 8) & 0xff);
    bytes.push((l >> 16) & 0xff);
    bytes.push((l >> 24) & 0xff);
    return bytes;
}

exports.CMD_TYPE = CMD_TYPE
exports.req = req
exports.parseData = parseData
exports.PARSE_CODE = PARSE_CODE
