import React, {Component, Fragment} from 'react';
import s5 from "./less/mcOnDone5.less";
const {toHex} = require('./util/ballUtil')
let _goBackTimer = null
class McDone5 extends Component {
    constructor(props) {
        super(props)
        this.state = {
            currentMcVersion: -1,
            time: 5
        }
    }
    componentDidMount() {
        const {spManager} = this
            .props
            spManager
            .fetchVersion((v) => {
                console.log('[MC VERSION]: ', v);
                this.setState({currentMcVersion: v});
                this
                    .props
                    .updateCurrVersion({which: 'mc', v})
            });
        if (!_goBackTimer) {
            let time = 5
            _goBackTimer = setInterval(() => {
                time = time - 1
                this.setState({time})
                if (time == 0) {
                    clearInterval(_goBackTimer)
                    _goBackTimer = null
                    this.goBack()
                }

            }, 1000)
        }
    }

    goBack = () => {
        if (_goBackTimer) {
            clearInterval(_goBackTimer)
            _goBackTimer = null
        }
        this
            .props
            .backToHome()
    }

    render() {
        const {maxMcVersion} = this.props
        const {currentMcVersion} = this.props
        const {messages} = this.props
        const {time} = this.state
        let showcurrentMcVersion = toHex(messages, currentMcVersion)
        let startPic = require('./src/ball/mc.png')
        let yesIcon = require('./src/yes.png')
        return (
            <div className={s5['warper']}>
                <img src={startPic} className={s5['pic']} alt=""/>
                <div className={s5['uTip']}>
                    <img src={yesIcon}/>{/*主控球升级成功，5秒后返回*/}{messages['l5_mc_is_done'].replace('5%', time)}
                </div>
                <span
                    className={s5['uButton']}
                    onClick={() => {
                        this.goBack()
                    }}>{/*返回首页*/}{messages['to_home']}</span>
                <div className={s5['uVer']}>{/* 当前主控版本：*/}{messages['curr_mc']}{showcurrentMcVersion}{
                        currentMcVersion == maxMcVersion
                            ? messages['is_later']
                            : messages['not_later']
                    }</div>
            </div>

        );
    }

}

export default McDone5
