import React, {Component, Fragment} from 'react';
import s10 from './less/ballFail10.less'
import Progress from "./progress";
import c from 'classnames'
import s7 from "./less/ballup7.less";

const {tips, enname, indexes, getCheckedBallname, toHex} = require('./util/ballUtil')
let _timer = null, _scanBallTimer = null, _scanBallNum = 0

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
            showNotGoHome:false


        }
    }

    componentDidMount() {
        const {currentMcVersion, maxMcVersion, selected, spManager, messages} = this.props
        let {ballChName} = getCheckedBallname(messages, selected)
        this.setState({
            currentMcVersion, maxMcVersion, selected, spManager, selectedBallName: ballChName
        })
        this.startDownFirm()
        // _scanBallTimer = setInterval(this.getelectedConnBallNativeinfo, 2000)
    }

   // componentWillUnmount() {
   //      clearInterval(_scanBallTimer)
   //      _scanBallTimer = null
   //  }

   /* getelectedConnBallNativeinfo = () => {
        const {spManager, selected} = this.props
        spManager.fetchOnlineListOnce((data) => {
            // 0 ---- battery
            // 1 ---- driver
            // 2 ---- infrared
            // 3 ---- color
            // 4 ---- touch
            // 5 ---- waist
            // 6 ---- arm
            let moduleIsOK = false;
            let ballIndex = 0
            let ballNum = 0
            console.log('连接的功能球数组', data)
            data.forEach((v, i) => {
                if (v == 1) {
                    ballIndex = i+1
                    ballNum++
                }else if(v>1){
                    ballIndex = i+1
                    ballNum+=v
                }
            })
            if (ballNum>1) {
                this.getConnBallInfo(ballIndex)
            }
            if (ballNum == 1) {
                if (selected != ballIndex) {
                    this.setState({
                        showChangeBall: true
                    })
                }
                this.getConnBallInfo(ballIndex)
            }
            if(ballNum == 0){
                this.setState({
                    ballVersion:-1
                })
            }
            this.setState({
                ballNum
            })
        })
    }*/
    /*getConnBallInfo = (ballIndex) => {
        const {spManager, messages} = this.props
        let ballSPMIndex = null
        ballSPMIndex = indexes(ballIndex)
        let {ballChName} = getCheckedBallname(messages, ballIndex)
        console.log('连接球的名称', ballChName)
        spManager.fetchVersionSingleModule(ballSPMIndex, 1, (ballVersion) => {
            this.setState({
                ballVersion, ballName: ballChName, ballSPMIndex
            })
            if (ballVersion == 1281 || ballVersion == 1282 || ballVersion == 1284) {
                this.setState({
                    ballIsNewestVersion: true
                })
            }
            console.log('ballVersion--reall', ballVersion)
        })
    }*/

 /*   changeBallToUp = () => {
        const {ballSPMIndex, ballName} = this.state
        let ballInfo = {ballSPMIndex, ballName}
        console.log(ballSPMIndex)
        this.setState({
            showChangeBall: false
        })
        this.props.changeBallToUp(ballInfo)
    }*/
    upgrade = () => {
        const {ballVersion, ballNum, ballIsNewestVersion, ballSPMIndex} = this.state
        // console.log('ballNum', this.state.ballNum)
        const {currentMcVersion, selected} = this.props

        this.setState({
            isCLickUp: true
        })

        //upgrade
        // if (!ballIsNewestVersion && ballNum == 1 && selected == ballSPMIndex) {
            this.doBallUp()
        // }
    }
    doBallUp = () => {
        const {currentMcVersion, ballVersion, ballIsNewestVersion} = this.state
        let info = {currentMcVersion, ballVersion, ballIsNewestVersion}
        this.props.doBallUp(info)
    }
    startDownFirm = () => {
        const {downDone}=this.state
        if (!_timer && !downDone) {
            _timer = setInterval(() => {
                const {progress} = this.state
                if (progress == 100) {
                    clearInterval(_timer)
                    _timer = null
                    this.setState({downDone: true, clickX: true})
                    return
                }
                this.setState({progress: progress + 1})
            }, 30)
        }
    }
    // closeDownFirm = () => {
    //     const {downDone, selected, ballSPMIndex} = this.state
    //     if (!downDone) return
    //     this.setState({
    //         clickX: true
    //     })
    //     if (selected != ballSPMIndex) {
    //         this.setState({
    //             showChangeBall: true
    //         })
    //     }
    // }
    backToHome=()=>{
        const {downDone} = this.state
        console.log(downDone)
        if (!downDone){
            this.setState({
                showNotGoHome: true
            })
            return
        }
        this.props.backToHome()
    }

    render() {
        const {
            ballNum, isCLickUp, clickX, ballName, ballIsNewestVersion, ballVersion, downDone, showDownGrade, progress, goOnUpWithDownMc
            , showChangeBall, selectedBallName,showNotGoHome
        } = this.state

        const {messages, selected} = this.props
        let {maxMcVersion, currentMcVersion} = this.props
        let {ballEnName, ballChName} = getCheckedBallname(messages, selected)
        let uerCheckBallPic = require('./src/frantBall/' + ballEnName + '1.png')
        let connBase = require('./src/connBase.png')
        console.log(ballVersion)
        if (ballVersion > 0 && !downDone) {
            this.startDownFirm()
        }
        let DownDoneText = downDone ? messages['l10_down_done']: messages['l10_do_downing']
        let showcurrentMcVersion = toHex(messages,currentMcVersion)
        let showballVersion = toHex(messages,ballVersion)
        return (
            <div className={s10['warper']}>
                <span onClick={this.backToHome} className={s10['back']}>  </span>
                <div className={s10['uTitle']}>{ballChName}{/* 固件升级：*/}{messages['l7_ball_up']}</div>
                <div className={s10['pic']}>
                    <img src={uerCheckBallPic} className={c(s10['userPickPic'], s10['arm'])} alt=""/>
                    <img src={connBase} alt=""/>
                </div>

                <div className={s10['uWarning']}>{/* 请先拔掉：*/}{messages['l10_1_pull']}{ballChName}{/* ，再插上*/}{messages['l10_2_push']}{ballChName}{/*进行升级*/}{messages['l7_douping']}</div>

                <span className={s10['uButton']} onClick={() => {
                    this.upgrade()
                }}>{/*升级*/}{messages['up']}
                </span>

                <div className={s10['uVer']}>
                    <div
                    >{/* 当前主控版本：*/}{messages['curr_mc']}{showcurrentMcVersion},{currentMcVersion == maxMcVersion ? messages['is_later'] : messages['not_later']}</div>
                    <div
                        className={s10['uVer2']}>{/*当前*/}{messages['curr']}{ballChName}{/*版本：*/}{messages['vers']}{showballVersion},{ballIsNewestVersion ? messages['is_later'] : messages['not_later']}</div>
                </div>


                {!clickX ? <div className={s10['hUpMode']}>
                    <div className={s10['hcHeader']}>
                        {/*提示*/} {messages['tips']}
                    </div>
                    <div className={s10['hcTip']}>{DownDoneText}</div>
                    <Progress percentageNum={progress} isupMode={'isupMode'} isDownFirm={'isDownFirm'}/>
                </div> : null}
                {showNotGoHome?
                    <div className={s10['hcAlert']}>
                        <div className={s10['hcHeader']}>
                            {/*提示*/} {messages['tips']}
                            <span onClick={() => {
                                this.setState({
                                    showNotGoHome: false
                                })
                            }} className={s10['hcClose']}>×</span>
                        </div>
                        <div className={s10['hcTip']}>{/*升级模式中不可跳转页面*/}{messages['l7_not_jump']}</div>
                        <div className={s10['ucButton']} onClick={() => {
                            this.setState({
                                showNotGoHome: false
                            })
                        }}>{/*确定*/}{messages['yes']}
                        </div>
                    </div>
                    : null}
            </div>
        );
    }
}

export default BallFail10
