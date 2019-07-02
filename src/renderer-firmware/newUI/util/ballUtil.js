// 用户选择=>SPManger定义
const indexes = (selected) => {
  let tips = null
  switch (selected) {
    case 2:
      tips = SPManager.MODULE_DRIVER
      break
    case 6:
      tips = SPManager.MODULE_WAIST
      break
    case 7:
      tips = SPManager.MODULE_ARM
      break
    case 4:
      tips = SPManager.MODULE_COLOR
      break
    case 3:
      tips = SPManager.MODULE_INFRARED
      break
    case 5:
      tips = SPManager.MODULE_TOUCH
      break
  }
  return tips
}
exports.indexes = indexes
// 用户选择=>英文
const enname = (selected) => {
  let tips = null
  switch (selected) {
    case 2:
      tips = 'dr'
      break
    case 6:
      tips = 'waist'
      break
    case 7:
      tips = 'arm'
      break
    case 4:
      tips = 'color'
      break
    case 3:
      tips = 'ir'
      break
    case 5:
      tips = 'touch'
      break
  }
  return tips
}
exports.enname = enname
// 用户选择=>国际化
const tips = (messages, selected) => {
  let tips = null
  switch (selected) {
    case SPManager.MODULE_DRIVER:
      tips = messages['mu_module_driver']
      break
    case SPManager.MODULE_WAIST:
      tips = messages['mu_module_waist']
      break
    case SPManager.MODULE_ARM:
      tips = messages['mu_module_arm']
      break
    case SPManager.MODULE_COLOR:
      tips = messages['mu_module_color']
      break
    case SPManager.MODULE_INFRARED:
      tips = messages['mu_module_ir']
      break
    case SPManager.MODULE_TOUCH:
      tips = messages['mu_module_touch']
      break
  }
  return tips
}
exports.tips = tips
// 用户选择=>中英文名称
exports.getCheckedBallname = (messages, selected) => {
  let ballSPMIndex = indexes(selected)
  let en = enname(selected)
  let ch = tips(messages, ballSPMIndex)
  let ballInfo = {
    ballEnName: en,
    ballChName: ch
  }
  return ballInfo
}
exports.toHex = (messages, num) => {
  if (num < 0) {
    return messages['cantfind']
  }
  return '0' + num.toString(16)
}
