import React, {Component, Fragment} from 'react';
import s7 from './less/ballup7.less'
import Progress from "./progress";
import c from 'classnames'
const {indexes, getCheckedBallname, toHex} = require('./util/ballUtil');
let _NativeTimer = null; //升级之后的微调整
let _scan = null; //扫描连接的功能球,页面内始终有效
class BallUp7 extends Component {
    constructor(props) {
        super(props)
        this.state = {
            oldMcVersion: 1027,
            needUpgrade: true,
            showAlert: false,
            currentMcVersion: -1,
            maxMcVersion: -1,
            ballVersion: -1,
            selected: null,
            selectedBallName: "",
            spManager: null,
            progress: 0,
            ballNum: 0,
            isCLickUp: false,
            needDownMCVersion: false,
            ballSPMIndex: SPManager.MODULE_DRIVER,
            ballName: '',
            showDownGrade: false,
            goOnUpWithDownMc: false,
            ballIsNewestVersion: false,
            showNotGoHome: false,
            showChangeBall: false

        }
    }

    componentDidMount() {
        const {currentMcVersion, maxMcVersion, selected, spManager, messages} = this.props
        let {ballChName} = getCheckedBallname(messages, selected)
        this.setState(
            {currentMcVersion, maxMcVersion, selected, spManager, selectedBallName: ballChName}
        )
        //扫描连接的功能球
        if (!_scan) {
            _scan = setInterval(this.getelectedConnBallNativeinfo, 1500)
        } else {
            clearInterval(_scan)
            _scan = null
        }

    }
    componentWillUnmount() {
        clearInterval(_scan)
        _scan = null
        clearInterval(_NativeTimer)
        _NativeTimer = null
    }

    getelectedConnBallNativeinfo = () => {
        const {spManager, selected} = this
            .props
            spManager
            .fetchOnlineListOnce((data) => {
                // 0 ---- battery 1 ---- driver 2 ---- infrared 3 ---- color 4 ---- touch 5 ----
                // waist 6 ---- arm
                let ballIndex = 0
                let ballNum = 0
                console.log('连接的功能球数组', data)
                data.forEach((v, i) => {
                    if (i != 0) { // 旧版电池球排除
                        if (v == 1) { //一种球有一个
                            ballIndex = i + 1
                            ballNum++
                        } else if (v > 1) { //一种球有多个球
                            ballIndex = i + 1
                            ballNum += v
                        }
                    }
                })
                //多于一个球,不能升级
                if (ballNum > 1) {
                    this.getConnBallInfo(ballIndex)
                }
                //插错了出弹框,插对了广播球状态
                if (ballNum == 1) {
                    if (selected != ballIndex) {
                        this.setState({showChangeBall: true})
                    }
                    this.getConnBallInfo(ballIndex)
                }
                //没检测到球
                if (ballNum == 0) {
                    this.setState({ballVersion: -1})
                }
                this.setState({ballNum})
            })
    }
    getConnBallInfo = (ballIndex) => {
        const {spManager, messages} = this.props
        let ballSPMIndex = null
        ballSPMIndex = indexes(ballIndex)
        let {ballChName} = getCheckedBallname(messages, ballIndex)
        console.log('连接球的名称', ballChName)
        spManager.fetchVersionSingleModule(ballSPMIndex, 1, (ballVersion) => {
            this.setState({ballVersion, ballName: ballChName, ballSPMIndex})
            if (ballVersion == 1281 || ballVersion == 1282 || ballVersion >= 1283) {
                this.setState({ballIsNewestVersion: true})
            } else {
                this.setState({ballIsNewestVersion: false})
            }
            console.log('球的版本号--最新？', ballVersion, this.state.ballIsNewestVersion)
        })
    }

    changeBallToUp = () => {
        const {ballSPMIndex, ballName} = this.state
        let ballInfo = {
            ballSPMIndex,
            ballName
        }
        console.log(ballSPMIndex)
        this.setState({showChangeBall: false})
        this
            .props
            .changeBallToUp(ballInfo)
    }

    upgrade = () => {
        let needDownMCVersion = false
        this.setState({isCLickUp: true})

        const {showDownGrade, ballVersion, ballNum, ballName, ballIsNewestVersion} = this.state
        // if(ballNum>1)return;
        console.log(showDownGrade, ballVersion, ballNum, ballName)
        const {messages, selected} = this.props
        let {ballChName: selectedBallName} = getCheckedBallname(messages, selected)
        console.log('up', selectedBallName)
        //降级时不能升级
        if (showDownGrade) {
            this.setState({isCLickUp: false})
            return
        }
        console.log('ballNum', ballNum)
        const {currentMcVersion} = this.props
        if (ballVersion < 0) { //can not find moudule ball
             //升级前需要先降级
            if (currentMcVersion > 1026) {
                this.setState({needDownMCVersion: true})
            } // MC version is new
            return
        } else {
            if (ballIsNewestVersion) 
                return
        }

        //upgrade
        console.log(
            'upprop',
            needDownMCVersion,
            ballVersion,
            ballIsNewestVersion,
            ballNum,
            selectedBallName,
            ballName
        )
        /**
         * 升级的必要条件: 主控不需要降级,球能被检测到,球版本不是最新,球数量为1,插入的球和选择的球吻合
         */
        if (!needDownMCVersion && !ballIsNewestVersion && ballNum == 1 && selectedBallName == ballName) {
            this.doBallUp()
        }

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
    downgrade = () => {
        const {showDownGrade, selected, oldMcVersion} = this
            .state
            if (showDownGrade) 
                return //only can upgrade one time
            this
            .setState({showDownGrade: true})
        // 主控先降级
        const {spManager} = this.state
        const {currentMcVersion, maxMcVersion} = this.props
        let pushVersion
        if (currentMcVersion < 1280) {
            pushVersion = maxMcVersion
        } else {
            pushVersion = 1027
        }

        spManager.upgrade(() => {
            console.log('[Downgrade MC Started]: ');
        }, (p) => {
            if (p < 1) 
                return;
            this.setState({progress: p});
            console.log('[Downgrade MC Prorgess]: ', p);
        }, () => {
            console.log('all in 5555')
            if (!_NativeTimer) {
                _NativeTimer = setInterval(() => {
                    const {progress} = this.state

                    if (progress == 100) {
                        this.setState({progress: 0})
                        clearInterval(_NativeTimer)
                        _NativeTimer = null
                    } else {
                        this.setState({
                            progress: progress + 1
                        })
                    }
                }, 1000)
            }
            // 45s后烧入成功
            setTimeout(() => {
                console.log('[Downgrade MC Successfully]: ');
                this.setState(
                    {showDownGrade: false, progress: 0, goOnUpWithDownMc: true, currentMcVersion: pushVersion}
                );
                this
                    .props
                    .setCurrVersion(pushVersion)
                this.getelectedConnBallNativeinfo()
            }, 45 * 1000);
        }, () => {
            // 降级失败, FIXME: 回退到第2步
            this.setState({step: 'step2', progress: 0});
            console.log('[Downgrade Failed]: ');
        }, pushVersion);
    }

    render() {
        const {
            ballNum,
            isCLickUp,
            ballName,
            showNotGoHome,
            currentMcVersion,
            showChangeBall,
            ballIsNewestVersion,
            ballVersion,
            showDownGrade,
            progress,
            goOnUpWithDownMc
        } = this.state
        const {selected, maxMcVersion, messages} = this.props
        let {ballEnName, ballChName: selectedBall} = getCheckedBallname(
            messages,
            selected
        )
        console.log('mc ver', maxMcVersion, currentMcVersion)
        console.log(selectedBall, ballName, "选择的球名--检测的球名称")
        let uerCheckBallPic = require('./src/frantBall/' + ballEnName + '.png')
        let connBase = require('./src/connBase.png')
        let denyUpgradeClass = showDownGrade
            ? s7['uButton-disable']
            : ""
        let yesIcon = require('./src/yes.png')
        let showcurrentMcVersion = toHex(messages, currentMcVersion)
        let showballVersion = toHex(messages, ballVersion)
        return (
            <div className={s7['warper']}>
                <span
                    onClick={() => {
                        if (showDownGrade) {
                            this.setState({showNotGoHome: true})
                            return
                        }
                        this
                            .props
                            .backToHome()
                    }}
                    className={s7['back']}></span>
                <div className={s7['uTitle']}>{selectedBall}{/* 固件升级：*/}{messages['l7_ball_up']}</div>
                <div className={s7['pic']}>
                    <img
                        src={uerCheckBallPic}
                        className={c(s7['userPickPic'], s7[ballEnName])}
                        alt=""/>
                    <img src={connBase} alt=""/>
                </div>

                <div className={s7['uTip']}>{/* 请按如上图使用USB线连接Mabot：*/}{messages['l3_usb_must']}</div>
                <div
                    className={s7['uLink']}
                    onClick={() => {
                        this.downgrade()
                    }}>{/* 一直未检测到1%,请点击这里*/}{messages['l7_no_conn_until'].replace(/1%/g, selectedBall)}
                </div>
                <span
                    className={c(s7['uButton'], denyUpgradeClass)}
                    onClick={() => {
                        this.upgrade()
                    }}>{/*升级*/}{messages['up']}
                </span>

                <table className={s7['uTable']}>
                    <tr className={s7['uTr']}>
                        <td className={s7['uTd']}>{/* 当前主控版本：*/}{messages['curr_mc']}</td>
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
                    <tr className={s7['uTr']}>
                        <td className={s7['uTd']}>{/*当前*/}{messages['curr']}{ballName}{/*版本：*/}{messages['vers']}</td>
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
                    showChangeBall && ballNum == 1 && selectedBall != ballName
                        ? <div className={s7['hcAlert']}>
                                <div className={s7['hcHeader']}>
                                    {/*提示*/}
                                    {messages['tips']}
                                    <span
                                        onClick={() => {
                                            this.setState({showChangeBall: false})
                                        }}
                                        className={s7['hcClose']}>×</span>
                                </div>
                                <div className={s7['hcTip']}>{/*您插入的是1%,是否对该1%进行升级*/}{messages['l7_insert_is'].replace(/1%/g, ballName)}</div>
                                <div className={s7['btnGrp']}>
                                    <div
                                        className={s7['hcNo']}
                                        onClick={() => {
                                            this.setState({showChangeBall: false})
                                        }}>{/*取消*/}{messages['no']}
                                    </div>
                                    <div className={s7['hcYes']} onClick={this.changeBallToUp
}>{/*确定*/}{messages['yes']}
                                    </div>
                                </div>
                            </div>
                        : null
                }

                {
                    isCLickUp && ballNum > 1
                        ? <div className={s7['hcAlert']}>
                                <div className={s7['hcHeader']}>
                                    {/*提示*/}
                                    {messages['tips']}
                                    <span
                                        onClick={() => {
                                            this.setState({isCLickUp: false})
                                        }}
                                        className={s7['hcClose']}>×</span>
                                </div>
                                <div className={s7['hcTip']}>{/*只能连接一个1%进行升级，请拔下多余的1%*/}{messages['l7_only_one'].replace(/1%/g, selectedBall)}</div>
                                <div
                                    className={s7['ucButton']}
                                    onClick={() => {
                                        this.setState({isCLickUp: false})
                                    }}>{/*确定*/}{messages['yes']}
                                </div>
                            </div>
                        : null
                }

                {
                    showNotGoHome
                        ? <div className={s7['hcAlert']}>
                                <div className={s7['hcHeader']}>
                                    {/*提示*/}
                                    {messages['tips']}
                                    <span
                                        onClick={() => {
                                            this.setState({showNotGoHome: false})
                                        }}
                                        className={s7['hcClose']}>×</span>
                                </div>
                                <div className={s7['hcTip']}>{/*升级模式中不可跳转页面*/}{messages['l7_not_jump']}</div>
                                <div
                                    className={s7['ucButton']}
                                    onClick={() => {
                                        this.setState({showNotGoHome: false})
                                    }}>{/*确定*/}{messages['yes']}
                                </div>
                            </div>
                        : null
                }

                {
                    isCLickUp && ballNum == 0
                        ? <div className={s7['hcAlert']}>
                                <div className={s7['hcHeader']}>
                                    {/*提示*/}
                                    {messages['tips']}
                                    <span
                                        onClick={() => {
                                            this.setState({isCLickUp: false})
                                        }}
                                        className={s7['hcClose']}>×</span>
                                </div>
                                <div className={s7['hcTip']}>{/*未检测到1%,请插入1%*/}{messages['l7_not_find'].replace(/1%/g, selectedBall)}</div>
                                <div
                                    className={s7['ucButton']}
                                    onClick={() => {
                                        this.setState({isCLickUp: false})
                                    }}>{/*确定*/}{messages['yes']}
                                </div>
                            </div>
                        : null
                }

                {
                    isCLickUp && ballIsNewestVersion && ballNum == 1 && selectedBall == ballName
                        ? <div className={s7['hcAlert']}>
                                <div className={s7['hcHeader']}>
                                    {/*提示*/}
                                    {messages['tips']}
                                    <span
                                        onClick={() => {
                                            this.setState({isCLickUp: false})
                                        }}
                                        className={s7['hcClose']}>×</span>
                                </div>
                                <div className={s7['hcTip']}>{/*当前*/}{messages['curr']}{selectedBall}{/*固件已经是最新版本，无需升级。*/}{messages['l7_firm_islater']}</div>
                                <div
                                    className={s7['ucButton']}
                                    onClick={() => {
                                        this.setState({isCLickUp: false})
                                    }}>{/*确定*/}{messages['yes']}
                                </div>
                            </div>
                        : null
                }

                {
                    showDownGrade
                        ? <div className={s7['hUpMode']}>
                                <div className={s7['hcHeader']}>{/*升级模式*/}{messages['l7_up_module']}</div>
                                <Progress percentageNum={progress} isupMode={'isupMode'}/>
                            </div>
                        : null
                }

                {
                    goOnUpWithDownMc
                        ? <div
                                className={c(s7['hcAlert'], s7['goOnUpWithDownMc'])}
                                style={{
                                    height: '280px'
                                }}>
                                <div className={s7['hcHeader']}>
                                    {/*升级模式*/}{messages['l7_up_module']}
                                    <span
                                        onClick={() => {
                                            this.setState({goOnUpWithDownMc: false})
                                        }}
                                        className={s7['hcClose']}>×</span>
                                </div>
                                <div className={s7['uWarning']}>
                                    {/*请在所有功能球升级完成后，再升级主控球。*/}{messages['l7_then_upMc']}</div>
                                <div className={s7['hContcat']}>
                                    <img src={yesIcon} alt=""/>
                                    <p>{/*点击【升级】按钮重新升级功能球，如果还是未识别到功能球请联系客服。*/}{messages['l7_then_contact_service']}</p>
                                </div>
                                <div className={s7['btnGrp']}>
                                    <div
                                        className={s7['hcNo']}
                                        onClick={() => {
                                            this.setState({goOnUpWithDownMc: false})
                                        }}>{/*取消*/}{messages['no']}
                                    </div>
                                    <div
                                        className={s7['hcYes']}
                                        onClick={() => {
                                            this.setState({goOnUpWithDownMc: false})
                                        }}>{/*确定*/}{messages['yes']}
                                    </div>
                                </div>
                            </div>
                        : null
                }

            </div>
        );
    }
}

export default BallUp7
