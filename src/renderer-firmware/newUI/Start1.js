import React, {Component} from 'react';
import s1 from './less/start1.less'
import c from 'classnames'

const {ipcRenderer} = require('electron');
require('../native.js');

class Start1 extends Component {

    constructor(props) {
        super(props)
        this.state = {
            showTips: false,
            connected: false,
            currentMcVersion: -1,
            spManager: null,
            checkLink: false,
            showFreRed: false,
            showNoPlatfrom: false,
            installDrive: false,
            installNow: false
        }
    }

    showAlert = () => {
        this.setState({showTips: true})
    }
    hideAlert = () => {
        this.setState({showTips: false})
    }

    isConnected = (val = false) => {
        this
            .props
            .getConnected(val)
    }
    installDriver = () => {
        this.setState({installDrive: true})
    }
    onInstallDriver = () => {
        this.setState({installDrive: false})
        let driverPath
        if (process.platform === 'win32') {
            driverPath = require('../assets/driver/CH34x_Install_Windows_v3_4.EXE')
        } else if (process.platform === 'darwin') {
            driverPath = require('../assets/driver/CH34x_Install_V1.4.pkg')
        } else {
            this.setState({showNoPlatfrom: true})
            return
        }
        ipcRenderer.send('install-driver', driverPath)
    }
    onMcUp = () => {
        const {connected, currentMcVersion, spManager} = this
            .state
            console
            .log(connected)
        if (!connected) {
            this.setState({checkLink: true, showTips: false})
            return
        }
        this.isConnected({connected, currentMcVersion, spManager, onMcUp: true})
    }
    closeCheckLink = () => {
        this.setState({checkLink: false})
    }

    render() {
        const {showTips, checkLink, showFreRed, showNoPlatfrom, installDrive} = this.state
        const {messages} = this.props
        let startPic = require('./src/start.png')
        let redball = require('./src/ball/redball.png')
        let redballup = require('./src/ball/redballup1.png')
        return (
            <div className={s1['warper']}>
                <img src={startPic} className={s1['pic']} alt=""/>
                <div className={s1['uTip']}>{messages['l1_title_tips']}{/* 请按如上图使用USB线连接Mabot */}</div>
                <span className={s1['uLink']} onClick={this.showAlert}>{messages['l1_no_react']}{/* 已连接上，但仍没有反应 */}</span>
                <div className={s1['uVer']}>{messages['l1_version']}{/* 客户端版本号V1.0 */}</div>
                {
                    showTips
                        ? <div className={s1['hmAlert']}>
                                <div className={s1['hHeader']}>
                                    {messages['tips']}{/* 提示 */}
                                    <span onClick={this.hideAlert} className={s1['hClose']}>×</span>
                                </div>
                                <div className={s1['hTitle']}>{messages['l1_no_mc']}{/* 未监测到主控，请尝试以下操作 */}</div>
                                <ul className={s1['hUl']}>
                                    <li>{messages['l1_for_1']}{/* 方式一：检测USB线是否连接正确 */}</li>
                                    <li>{messages['l1_for_2']}{/* 方式二：尝试重新插拔主控，或者换个电脑USB接口 */}</li>
                                    <li>{messages['l1_for_31']/* 方式三： */}
                                        <span className={s1['hLink']} onClick={this.installDriver}>{messages['l1_for_32']/* 点击安装驱动 */}</span>
                                    </li>
                                    <li>{messages['l1_for_4']}{/* 方式四：关掉其他软件，或者拔掉电脑其他串口设备 */}</li>
                                    <li>{messages['l1_for_51']}{/* 方法五：检查主控是否一直闪红灯，如果一直闪红灯， */}
                                        <span className={s1['hLink']} onClick={this.onMcUp}>{messages['l1_for_52']}{/* 点击升级主控 */}</span>
                                    </li>
                                </ul>
                            </div>
                        : null
                }
                {
                    checkLink
                        ? <div className={s1['hcAlert']}>
                                <div className={s1['hcHeader']}>
                                    {/*提示*/}
                                    {messages['tips']}
                                    <span onClick={this.closeCheckLink} className={s1['hcClose']}>×</span>
                                </div>
                                <div className={s1['hcTip']}>{/*请检查USB线是否连接正确*/}
                                    {messages['l1_if_connect']}</div>
                                <div className={s1['ucButton']} onClick={this.closeCheckLink}>{/*确定*/}{messages['yes']}</div>
                            </div>
                        : null
                }
                {
                    showNoPlatfrom
                        ? <div className={s1['hcAlert']}>
                                <div className={s1['hcHeader']}>
                                    {/*提示*/}
                                    {messages['tips']}
                                    <span
                                        onClick={() => {
                                            this.setState({showNoPlatfrom: false})
                                        }}
                                        className={s1['hcClose']}>×</span>
                                </div>
                                <div className={s1['hcTip']}>{messages['noPlatform']}</div>
                                <div
                                    className={s1['ucButton']}
                                    onClick={() => {
                                        this.setState({showNoPlatfrom: false})
                                    }}>{/*确定*/}{messages['yes']}</div>
                            </div>
                        : null
                }

                {
                    installDrive
                        ? <div className={c(s1['hrAlert'], s1['install'])}>
                                <div className={s1['hcHeader']}>
                                    {/*提示*/}
                                    {messages['tips']}
                                    <span
                                        onClick={() => {
                                            this.setState({installDrive: false})
                                        }}
                                        className={s1['hcClose']}>×</span>
                                </div>
                                <p className={c(s1['uTip'], s1['uTip-dc'])}>{messages['installDriver']}{messages['installDriverNotice']}</p>
                                <div className={s1['btnGrp']}>
                                    <div
                                        className={s1['hcNo']}
                                        onClick={() => {
                                            this.setState({installDrive: false})
                                        }}>
                                        {/*取消*/}{messages['no']}
                                    </div>
                                    <div className={s1['hcYes']} onClick={this.onInstallDriver}>{/*确定*/}{messages['yes']}
                                    </div>
                                </div>
                            </div>
                        : null
                }

                {
                    showFreRed
                        ? <div className={s1['hrAlert']}>
                                <div className={s1['hcHeader']}>
                                    {/*提示*/}
                                    {messages['tips']}
                                    <span
                                        onClick={() => {
                                            this.setState({showFreRed: false})
                                        }}
                                        className={s1['hcClose']}>×</span>
                                </div>
                                <img src={redballup} className={s1['redballup']}/>
                                <img src={redball} className={s1['redball']}/>
                                <p className={s1['uTip']}>{/*Mabot主控是否一直闪红灯?*/}{messages['l1_if_isblock']}</p>
                                <div className={s1['btnGrp']}>
                                    <div
                                        className={s1['hcNo']}
                                        onClick={() => {
                                            this.setState({showFreRed: false})
                                        }}>
                                        {/*取消*/}{messages['no']}
                                    </div>
                                    <div className={s1['hcYes']} onClick={this.onMcUp}>{/*确定*/}{messages['yes']}
                                    </div>
                                </div>
                            </div>
                        : null
                }

            </div>
        );
    }
}

export default Start1
