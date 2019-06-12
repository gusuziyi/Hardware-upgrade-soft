module.exports = {
  // 小球种类
  ballType: {
    mainControl: 0, // 主控
    battery: 1,     // 电池
    driver: 2,      // 轮子
    IR: 3,          // 红外
    color: 4,       // 颜色
    touch: 5,       // 触碰
    servoH: 6,      // 水平关节
    servoV: 7,      // 摇摆关节
  },
  // 灯光模式
  waveMode: {
    close: 1,       // 长关
    open: 2,        // 长开
    square: 3,      // 方波
    sine: 4,        // 正弦波
  },
  // 灯光颜色
  lightColor: {
    red: 1, // 红
    green: 2, // 绿
    yellow: 3, // 黄
    blue: 4, // 蓝
    purple: 5, // 紫
    alice: 6, // 湖蓝
    orange: 7, // 橙
    white: 8, // 白
    gray: 9, // 灰
  },
  // 颜色球工作模式
  colorMode: {
    ambient: 1,
    reflect: 2,
    recognize: 3,
  },
  // 颜色识别
  colorRecognize: {
    unknow: 0,
    black: 1,
    blue: 2,
    green: 3,
    yellow: 4,
    red: 5,
    white: 6,
    purple: 7,
    orange: 8,
  },
  // 颜色识别码对应的颜色值
  colorForRecognize: function(color) {
    switch (color) {
      case this.colorRecognize.unknow:
        return 'rgb(115, 115, 115)';
      case this.colorRecognize.black:
        return 'rgb(0, 0, 0)';
      case this.colorRecognize.blue:
        return 'rgb(0, 80, 220)';
      case this.colorRecognize.green:
        return 'rgb(120, 250, 0)';
      case this.colorRecognize.yellow:
        return 'rgb(255, 255, 0)';
      case this.colorRecognize.red:
        return 'rgb(255, 20, 40)';
      case this.colorRecognize.white:
        return 'rgb(255, 255, 255)';
      case this.colorRecognize.purple:
        return 'rgb(200, 30, 255)';
      case this.colorRecognize.orange:
        return 'rgb(255, 152, 0)';
      default:
        return 'rgb(115, 115, 115)';
    }
  }
}
