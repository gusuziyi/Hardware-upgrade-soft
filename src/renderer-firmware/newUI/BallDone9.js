import React, {Component, Fragment} from 'react';
import s9 from './less/ballDone9.less'

const {getCheckedBallname, toHex} = require('./util/ballUtil')
let _goBackTimer = null
class BallDone9 extends Component {
    constructor(props) {
        super(props)
        this.state = {
            time: 5
        }
    }

    componentDidMount() {
        const {spManager, selected} = this.props
        /**
         * update the ballVersion , 1 means the only one connnect
         * @param {selected} ballname
         * @param {number} fixed number 1
         * @param {cb} return the ballVersion whitch user selected
         */
            spManager.fetchVersionSingleModule(selected, 1, (ballVersion) => {
                this.props.updateCurrVersion({which: 'ball', v: ballVersion})
            })
        /**
         * watch dog for go home after 5 seconds
         *  */  
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
        this.props.backToHome()
    }

    render() {
        const {currentMcVersion, maxMcVersion, selected} = this.props
        let yesIcon = require('./src/yes.png')
        const {messages} = this.props
        const {time} = this.state
        let {ballEnName, ballChName: selectedBall} = getCheckedBallname(
            messages,
            selected
        )
        let uerCheckBallPic = require('./src/ball/' + ballEnName + '.png')
        let showcurrentMcVersion = toHex(messages, currentMcVersion)
        return (
            <div className={s9['warper']}>
                <img src={uerCheckBallPic} className={s9['pic']} alt=""/>
                <div className={s9['uTip']}>
                    <img src={yesIcon}/>{selectedBall}{/*升级成功，5秒后返回*/}{messages['l9_is_done'].replace('5%', time)}
                </div>
                <span
                    className={s9['uButton']}
                    onClick={() => {
                        this.goBack()
                    }}>{/*返回首页*/}{messages['to_home']}</span>

                <table className={s9['uTable']}>
                    <tbody>
                        <tr className={s9['uTr']}>
                            <td className={s9['uTd']}>{/* 当前主控版本：*/}{messages['curr_mc']}</td>
                            <td >{showcurrentMcVersion}{
                                    currentMcVersion == -1
                                        ? ''
                                        : (
                                            currentMcVersion == maxMcVersion
                                                ? messages['is_later']
                                                : messages['not_later']
                                        )
                                }</td>
                        </tr>
                        <tr className={s9['uTr']}>
                            <td className={s9['uTd']}>{/*当前*/}{messages['curr']}{selectedBall}{/*版本：*/}{messages['vers']}</td>
                            <td >0501{messages['is_later']}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }

}

export default BallDone9
