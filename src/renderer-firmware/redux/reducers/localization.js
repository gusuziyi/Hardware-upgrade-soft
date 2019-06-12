import actions from '../actions/localization.js'
import strings, {
  LANG_EN,
  LANG_HANS,
} from '../../utils/ln.js'

let currLang = navigator.language || navigator.userLanguage;
let lang = LANG_EN;
switch(currLang) {

  case 'zh-CN':
  case 'zh':
    strings.setLanguage(LANG_HANS);
    lang = LANG_HANS;
    break;
  default:
    strings.setLanguage(LANG_EN);
    break;
};

const initialState = {
  lang: lang,
  messages: strings
}

const reducer = (state = initialState, action) => {
  switch(action.type) {
    case actions.ACTION_SET_LANG:
      strings.setLanguage(action.lang)

      return Object.assign({}, state, {
        lang: action.lang,
        messages: strings
      })
  }
  return state
}

const changeLangEn = () => {
  return {
    type: actions.ACTION_SET_LANG,
    lang: LANG_EN
  }
}

const changeLangHans = () => {
  return {
    type: actions.ACTION_SET_LANG,
    lang: LANG_HANS
  }
}



export {
  reducer as default,
  changeLangEn,
  changeLangHans,
}
