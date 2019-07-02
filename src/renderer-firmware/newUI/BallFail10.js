import React, {Component, Fragment} from 'react';
import s10 from './less/ballFail10.less'
import Progress from "./progress";
import c from 'classnames'

const {getCheckedBallname, toHex} = require('./util/ballUtil')
//timer force to run download firmware
let _timer = null

class BallFail10 extends Component {
    constructor(props) {
        super(props)
        this.state = {
            needUpgrade: true,
            showAlert: false,
            currentMcVersion: -1,
            maxMcVersion: -1,
            ballVersion: -1,
            selected: 1,
            selectedBallName: '',
            spManager: null,
            progress: 0,
            ballNum: 0,
            isCLickUp: false,
            ballSPMIndex: SPManager.MODULE_DRIVER,
            ballName: '',
            showDownGrade: false,
            goOnUpWithDownMc: false,
            ballIsNewestVersion: false,
            downDone: false,
            clickX: false,
            showChangeBall: false,
            showNotGoHome: false
        }
    }

    componentDidMount() {
        const {currentMcVersion, maxMcVersion, selected, spManager, messages} = this.props
        let {ballChName} = getCheckedBallname(messages, selected)
        this.setState(
            {currentMcVersion, maxMcVersion, selected, spManager, selectedBallName: ballChName}
        )
        this.startDownFirm()
    }

    upgrade = () => {
        this.setState({isCLickUp: true})
        /**
         * force to do ball up no matter what happens ,because it is already be block
         */
        this.doBallUp()
    }
    doBallUp = () => {
        const {currentMcVersion, ballVersion, ballIsNewestVersion} = this.state
        let info = {
            currentMcVersion,
            ballVersion,
            ballIsNewestVersion
        }
        this
            .props
            .doBallUp(info)
    }
    startDownFirm = () => {
        const {downDone} = this.state
        if (!_timer && !downDone) {
            _timer = setInterval(() => {
                const {progress} = this
                    .state
                    if (progress == 100) {
                        clearInterval(_timer)
                        _timer = null
                        this.setState({downDone: true, clickX: true})
                        return
                    }
                    this
                    .setState({
                        progress: progress + 1
                    })
            }, 30)
        }
    }

    backToHome = () => {
        const {downDone} = this
            .state
            console
            .log(downDone)
        if (!downDone) {
            this.setState({showNotGoHome: true})
            return
        }
        this
            .props
            .backToHome()
    }

    render() {
        const {
            clickX,
            ballIsNewestVersion,
            ballVersion,
            downDone,
            progress,
            showNotGoHome
        } = this.state

        const {messages, selected} = this.props
        let {maxMcVersion, currentMcVersion} = this.props
        let {ballEnName, ballChName: selectedBall} = getCheckedBallname(
            messages,
            selected
        )
        let uerCheckBallPic = require('./src/frantBall/' + ballEnName + '1.png')
        let connBase = require('./src/connBase.png')
        console.log(ballVersion)
        if (ballVersion > 0 && !downDone) {
            this.startDownFirm()
        }
        let DownDoneText = downDone
            ? messages['l10_down_done']
            : messages['l10_do_downing']
        let showcurrentMcVersion = toHex(messages, currentMcVersion)
        let showballVersion = toHex(messages, ballVersion)
        return (
            <div className={s10['warper']}>
                <span onClick={this.backToHome} className={s10['back']}></span>
                <div className={s10['uTitle']}>{selectedBall}{/* 固件升级：*/}{messages['l7_ball_up']}</div>
                <div className={s10['pic']}>
                    <img
                        src={uerCheckBallPic}
                        className={c(s10['userPickPic'], s10['arm'])}
                        alt=""/>
                    <img src={connBase} alt=""/>
                </div>

                <div className={s10['uWarning']}>{/* 请先拔掉：*/}{messages['l10_1_pull']}{selectedBall}</div>
                <div className={s10['uWarn']}>{/* 再插上*/}{messages['l10_2_push'].replace(/1%/g, selectedBall)}</div>
                <span
                    className={s10['uButton']}
                    onClick={() => {
                        this.upgrade()
                    }}>{/*升级*/}{messages['up']}
                </span>

                <table className={s10['uTable']}>
                    <tr className={s10['uTr']}>
                        <td className={s10['uTd']}>{/* 当前主控版本：*/}{messages['curr_mc']}</td>
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
                    <tr className={s10['uTr']}>
                        <td className={s10['uTd']}>{/*当前*/}{messages['curr']}{selectedBall}{/*版本：*/}{messages['vers']}</td>
                        <td >{showballVersion}{
                                ballVersion == -1
                                    ? ''
                                    : (
                                        ballIsNewestVersion
                                            ? messages['is_later']
                                            : messages['not_later']
                                    )
                            }</td>
                    </tr>
                </table>

                {
                    !clickX
                        ? <div className={s10['hUpMode']}>
                                <div className={s10['hcHeader']}>
                                    {/*提示*/}
                                    {messages['tips']}
                                </div>
                                <div className={s10['hcTip']}>{DownDoneText}</div>
                                <Progress
                                    percentageNum={progress}
                                    isupMode={'isupMode'}
                                    isDownFirm={'isDownFirm'}/>
                            </div>
                        : null
                }
                {
                    showNotGoHome
                        ? <div className={s10['hcAlert']}>
                                <div className={s10['hcHeader']}>
                                    {/*提示*/}
                                    {messages['tips']}
                                    <span
                                        onClick={() => {
                                            this.setState({showNotGoHome: false})
                                        }}
                                        className={s10['hcClose']}>×</span>
                                </div>
                                <div className={s10['hcTip']}>{/*升级模式中不可跳转页面*/}{messages['l7_not_jump']}</div>
                                <div
                                    className={s10['ucButton']}
                                    onClick={() => {
                                        this.setState({showNotGoHome: false})
                                    }}>{/*确定*/}{messages['yes']}
                                </div>
                            </div>
                        : null
                }
            </div>
        );
    }
}

export default BallFail10
