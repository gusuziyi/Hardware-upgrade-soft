/**
 * 插件基类。串口通信具体功能依赖于插件实现
 * onPortData onPortError onPortClose portWrite 是宿主串口通信方法的一个转接
 * entrance exit 方法是切换插件时调用，子类重写时始终应当调用父类方法
 * expose 是宿主 inject 本插件时会调用的方法。ctx 参数就是宿主，你应该向 ctx 中添加方法，用来向宿主中添加接口方法
 */
class SP_plugin {
  constructor() {
    // 插件状态
    this.active = false
  }

  // dispatch serialport event
  onPortData() {

  }

  onPortError() {

  }

  onPortClose() {

  }

  /**
   * 写数据不是事件。这个方法将被重新指向
   * 目前逻辑是，宿主注入插件时，将这个方法重指向`port.write`
   */
  portWrite() {

  }

  // active plugin. subclass should override
  entrance() {
    this.active = true
  }

  // deactive plugin. subclass should override
  exit() {
    this.active = false
  }

  /**
   * expose methods to ctx. subclass should override
   * 各插件具有的接口无法统一，宿主无法用一种统一的方式去调用插件。这个方法将为宿主添加调用接口
   * @param ctx 宿主环境
   */
  expose(ctx) {

  }

  destroy() {

  }
}

module.exports = SP_plugin
