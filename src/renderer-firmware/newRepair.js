import React, {Component, Fragment} from 'react';
import {render} from 'react-dom';

require('./native.js');

import {createStore} from 'redux'
import {Provider} from 'react-redux'
import reducers from './redux/reducers/index.js'

const store = createStore(
    reducers,
    window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
)
import {connect} from 'react-redux';
import {changeLangEn, changeLangHans, changeLangHant} from './redux/reducers/localization.js';

const {ipcRenderer} = require('electron');
const {app} = require('electron').remote;

const mapStateToProps = state => (
    {lang: state.localization.lang, messages: state.localization.messages}
)
let _timer = null //long call for connect,it is for software
let _connTimer = null //for test if serial is connected , it is for hardware
/**
 * 底层开了一个c++进程,会一直扫描串口连接,但是有时会因为热插拔,栈溢出等问题挂掉,所以_connTimer是个死循环,
 * 内部有一个看门狗, 若7s内C++没有返回就强制重启进程, 而_timer是测试软件连接的,由组件内部 的connect信号触发,
 * 主要是测试是否有接触不良和变砖的
 */
let SP = null
const mapDispatchToProps = (dispatch, ownProps) => ({
    changeLangEn: () => {
        dispatch(changeLangEn())
    },

    changeLangHans: () => {
        dispatch(changeLangHans())
    },

    changeLangHant: () => {
        dispatch(changeLangHant())
    }
})
import TitleHeader from './newUI/Title'

let Title = connect(mapStateToProps, mapDispatchToProps)(TitleHeader);

import Start1 from './newUI/Start1'
import Choose2 from './newUI/Choose2'
import McUp3 from './newUI/McUp3'
import McOnUp4 from './newUI/McOnUp4'
import McDone5 from './newUI/McDone5'
import McFail6 from './newUI/McFail6'
import BallUp7 from "./newUI/BallUp7"
import BallOnUp8 from './newUI/BallOnUp8'
import BallDone9 from './newUI/BallDone9'
import BallFail10 from './newUI/BallFail10'
import home from "./newUI/less/home.less";

class NewContent extends Component {
    constructor(props) {
        super(props);

        this.state = {
            spManager: null,
            step: 'step1',
            maxMcVersion: 1286,
            currentMcVersion: -1,
            ballVersion: -1,
            ballIsNewestVersion: false,
            ballUpFailTime: 0,
            _scanTimer: false, //scan if mc is stock ,only scan for one time

            selected: SPManager.MODULE_ARM,
            ballName: '',
            alert: false,

            connected: false,
            progress: 0,
            mcIsStock: true,
            isDisConnected: false

        }
    }

    tips = (messages, selected) => {
        let tips = null;
        switch (selected) {
            case SPManager.MODULE_DRIVER:
                tips = messages['mu_module_driver'];
                break;
            case SPManager.MODULE_WAIST:
                tips = messages['mu_module_waist'];
                break;
            case SPManager.MODULE_ARM:
                tips = messages['mu_module_arm'];
                break;
            case SPManager.MODULE_COLOR:
                tips = messages['mu_module_color'];
                break;
            case SPManager.MODULE_INFRARED:
                tips = messages['mu_module_ir'];
                break;
            case SPManager.MODULE_TOUCH:
                tips = messages['mu_module_touch'];
                break;
        }
        return tips;
    }

    componentDidMount() {
        ipcRenderer.on("ChangeEn", (event, arg) => {
            this
                .props
                .changeLangEn();
        });
        ipcRenderer.on("ChangeCh", (event, arg) => {
            this
                .props
                .changeLangHans();
        });
        SP = this.newSP();
        this.testSp()

    }

    newSP = () => (new SPManager(() => {
        console.log('SP========')
        this.setState({connected: true});
        // 延迟500ms抓取mc固件版本号
        setTimeout(() => {
            SP.fetchVersion((v) => {
                console.log('[MC VERSION]: ', v);
                clearInterval(_connTimer)
                _connTimer = null
                this.setState({
                    currentMcVersion: v,
                    connected: true
                }, () => {
                    console.log('spManager,spManager', SP)

                });
                this.emitConnect({connected: true, currentMcVersion: v, spManager: SP})
                this.getConnected({connected: true, currentMcVersion: v, spManager: SP})
            });
        }, 500);
    }, () => {
        this.setState({connected: false, currentMcVersion: -1});
        clearInterval(_connTimer)
        console.log('close:SP', SP)
        SP.restart()
        _connTimer = null
        this.onDisConnected()
        setTimeout(this.testSp, 2000)
    }))
    ////UI 测试
    getConnected = (isConnected) => {
        let {connected, currentMcVersion, spManager, onMcUp} = isConnected
        const {mcIsStock} = this.state;
        console.log('isConnected', connected, currentMcVersion, spManager, onMcUp);
        if (connected) {
            // UI测试入口1 : 测试入口2再start1.js 130行,同时修改才会生效  
            // this.setState({      step: 'step10',
            // connected,      currentMcVersion,      spManager  }) 
            // return /此处加版本控制！！！！！！
            if (currentMcVersion < 0) {
                if (!mcIsStock) {
                    this.setState({ //不是砖选择球
                        step: 'step2',
                        connected,
                        currentMcVersion,
                        spManager
                    })
                } else {
                    this.setState({ //是砖升级
                        step: 'step4',
                        connected,
                        currentMcVersion,
                        spManager
                    })
                }

            } else {
                this.setState({ //版本大于0,必定不是砖
                    step: 'step2',
                    connected,
                    currentMcVersion,
                    spManager,
                    mcIsStock: false
                })
            }

        }
    }
    getChoosed = (choosed) => {
        if (choosed == 'MC') {
            this.setState({step: 'step3'})
            return
        }
        const {messages} = this.props
        let ballName = this.tips(messages, choosed)
        console.log(
            'cooseBallName',
            choosed,
            ballName,
            this.state.currentMcVersion,
            this.state.maxMcVersion
        )
        this.setState({step: 'step7', selected: choosed, ballName})
    }
    ifMcUp = (doMcUp = false) => {
        doMcUp
            ? this.setState({step: 'step4'})
            : ""
    }
    ifUpMcDone = (ifDone) => {
        let step = ifDone
            ? "step5"
            : "step6"
        const {mcIsStock, maxMcVersion} = this
            .state
            console
            .log(step, mcIsStock)
        this.setState({step, currentMcVersion: maxMcVersion})
    }
    ifUpBallDone = (ifDone) => {
        let step = ifDone
            ? "step9"
            : "step10"
        this.setState({step})
    }
    upBallIsFeilAndWillGoOn = (ballUpFailTime) => {
        this.setState({ballUpFailTime})
        console.log('ballUpFailTime', ballUpFailTime)
        this.ifUpBallDone(false)
    }
    backToHome = () => {
        this.setState({step: 'step2'})
    }
    changeBallToUp = ({ballSPMIndex, ballName}) => {
        this.setState({selected: ballSPMIndex, ballName})
        this.getChoosed(ballSPMIndex)
    }
    doBallUp = ({currentMcVersion, ballVersion, ballIsNewestVersion}) => {
        console.log('doBallUp')
        this.setState(
            {step: 'step8', currentMcVersion, ballVersion, ballIsNewestVersion}
        )

    }
    updateCurrVersion = (newCurrVersion) => {
        //@newCurrVersion {which,v}
        const {which, v} = newCurrVersion
        if (which == 'mc') {
            this.setState({currentMcVersion: v})
        } else {
            this.setState({ballVersion: v})
        }
    }
    hasSetScanTime = (hasSetScanTime) => {
        this.setState({_scanTimer: hasSetScanTime})
    }
    iAmStock = (isStock) => {
        console.log(isStock)
        this.setState({mcIsStock: isStock})
    }
    setCurrVersion = (version) => {
        this.setState({currentMcVersion: version})
    }
    onDisConnected = () => {

        this.setState({connected: false, isDisConnected: true, currentMcVersion: -1})
        setTimeout(() => {
            this.setState({isDisConnected: false})
        }, 3000)
        this.setState({step: 'step1'})
        console.log('disconnnect', this.state.currentMcVersion)

    }
    closeCheckLink = () => {
        this.setState({isDisConnected: false})
    }
    emitConnect = ({connected, currentMcVersion, spManager}) => {
        this.setState({connected, currentMcVersion, spManager})
    }

    testBlock = () => {
        let scanTime = 0
        const ifConnect = () => {
            const {connected, currentMcVersion, spManager} = this
                .props
                console
                .log('检测连接', connected, currentMcVersion)
            if (connected) {
                //UI测试入口2:currentMcVersion>0 =>currentMcVersion
                if (currentMcVersion < 0) {
                    clearInterval(_timer)
                    _timer = null
                    this.isConnected({connected, currentMcVersion, spManager})
                    return
                }
                scanTime++;
                if (scanTime > 5) {
                    this.setState({showFreRed: true})
                    this
                        .props
                        .hasSetScanTime(true)
                    clearInterval(_timer)
                    _timer = null
                } + 1
            }
        }
        if (!_timer) {
            _timer = setInterval(ifConnect, 1000)
        }

    }
    testSp = () => {
        let wachDog = 0
        _connTimer = setInterval(() => {
            let {connected, currentMcVersion} = this
                .state
                console
                .log(connected, currentMcVersion, SP)
            if (!connected) {
                if (!SP._port) {
                    wachDog++;
                    console.log('watchDog is sleep~~')
                    if (wachDog > 7) {
                        wachDog = 0
                        console.log('watchDog  is raking!!!!!')
                        SP.restart()
                    }

                } else {
                    console.log('已经插拔过', SP._port)
                    setTimeout(() => {
                        console.log('[#####已经插拔过setTimeout]: ');
                        SP.fetchVersion((v) => {
                            console.log('[MC VERSIONsss]: ', v);
                            this.setState({
                                currentMcVersion: v,
                                connected: true
                            }, () => {});
                            clearInterval(_connTimer)
                            _connTimer = null
                            console.log('spManager,spManager', SP)
                            this.emitConnect({connected: true, currentMcVersion: v, spManager: SP})
                            this.getConnected({connected: true, currentMcVersion: v, spManager: SP})

                        });
                    }, 500);
                }
            } else { // it is  connnect
                // 变砖检测,由于无法判断与仅加电,没开数据口的区别,故删掉 if(currentMcVersion<0){     this.testBlock() }
                // test ui if(currentMcVersion<0){     this.getConnected({connected: true,
                // currentMcVersion: 20, spManager: SP})     this.setState({step:'step1'})
                // return } /
            }
        }, 1000)
    }

    render() {
        const {step, isDisConnected} = this.state;
        const {messages} = this.props
        return (
            <Fragment>
                {
                    step === 'step1'
                        ? <Start1
                                {...this.props}
                                {...this.state}
                                getConnected={this.getConnected}
                                ifMcUp={this.ifMcUp}
                                hasSetScanTime={this.hasSetScanTime}
                                isDisConnected={this.onDisConnected}
                                emitConnect={this.emitConnect}/>
                        : null
                }
                {
                    step === 'step2'
                        ? <Choose2 {...this.props} {...this.state} getChoosed={this.getChoosed}/>
                        : null
                }
                <div>
                    {
                        step === 'step3'
                            ? <McUp3
                                    {...this.props}
                                    {...this.state}
                                    ifMcUp={this.ifMcUp}
                                    backToHome={this.backToHome}/>
                            : null
                    }
                </div>
                <div>
                    {
                        step === 'step4'
                            ? <McOnUp4
                                    {...this.props}
                                    {...this.state}
                                    ifUpMcDone={this.ifUpMcDone}
                                    iAmStock={this.iAmStock}/>
                            : null
                    }
                </div>
                <div>
                    {
                        step === 'step5'
                            ? <McDone5
                                    {...this.props}
                                    {...this.state}
                                    updateCurrVersion={this.updateCurrVersion}
                                    backToHome={this.backToHome}/>
                            : null
                    }
                </div>
                <div>
                    {
                        step === 'step6'
                            ? <McFail6 {...this.props} {...this.state} ifMcUp={this.ifMcUp}/>
                            : null
                    }
                </div>
                <div>
                    {
                        step === 'step7'
                            ? <BallUp7
                                    {...this.props}
                                    {...this.state}
                                    changeBallToUp={this.changeBallToUp}
                                    doBallUp={this.doBallUp}
                                    backToHome={this.backToHome}
                                    setCurrVersion={this.setCurrVersion}/>
                            : null
                    }
                </div>
                <div>
                    {
                        step === 'step8'
                            ? <BallOnUp8
                                    {...this.props}
                                    {...this.state}
                                    ifUpBallDone={this.ifUpBallDone}
                                    upBallIsFeilAndWillGoOn={this.upBallIsFeilAndWillGoOn}
                                    failOver6={() => {
                                        this.setState({step: 'step2'})
                                    }}/>
                            : null
                    }
                </div>
                <div>
                    {
                        step === 'step9'
                            ? <BallDone9 {...this.props} {...this.state} backToHome={this.backToHome}/>
                            : null
                    }
                </div>
                <div>
                    {
                        step === 'step10'
                            ? <BallFail10
                                    {...this.props}
                                    {...this.state}
                                    changeBallToUp={this.changeBallToUp}
                                    doBallUp={this.doBallUp}
                                    backToHome={this.backToHome}/>
                            : null
                    }
                </div>
                {
                    isDisConnected
                        ? <div className={home['hcAlert']}>
                                <div className={home['hcHeader']}>
                                    {/*提示*/}
                                    {messages['tips']}
                                    <span onClick={this.closeCheckLink} className={home['hcClose']}>×</span>
                                </div>
                                <div className={home['hcTip']}>{/*请检查USB线是否连接正确*/}
                                    {messages['l1_if_connect']}</div>
                                {/* <div className={home['ucButton']}
 * onClick={this.closeCheckLink}>/!*确定*!/{messages['yes']}</div>
 */
                                }
                            </div>
                        : null
                }

            </Fragment>
        )
    }
}

NewContent = connect(mapStateToProps, mapDispatchToProps)(NewContent);

setTimeout(function () {
    render(
        <Provider store={store}>
            <div
                style={{
                    backgroundColor: 'white',
                    backgroundSize: 'cover',
                    width: '1000px',
                    height: '600px',
                    boxSizing: 'border-box'
                }}>

                <Title/>
                <NewContent></NewContent>
            </div>
        </Provider>,
        document.getElementById(
            'app'
        )
    )
}, 1000)