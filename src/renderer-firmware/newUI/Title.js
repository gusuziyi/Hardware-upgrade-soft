import i from "./less/index.less";
let chIcon = require('./src/Chinese.png');
let enIcon = require('./src/english.png');
let helpIcon = require('./src/help.png');
import React, {Component, Fragment} from 'react';
const {ipcRenderer} = require('electron');
// 标题栏
export default class Title extends Component {
    constructor(props) {
        super(props)
        this.state = {
            lang: 'ch',
            showHelp: false
        }
    }
    useEn = () => {
        this.setState({lang: 'en'})
        this
            .props
            .changeLangEn()
        this.setState({lang: 'en'})

    }
    useCh = () => {
        this.setState({lang: 'ch'})
        this
            .props
            .changeLangHans()
        this.setState({lang: 'ch'})

    }
    close = () => {
        ipcRenderer.send('closed')
    }

    hide = () => {
        ipcRenderer.send('hide-window')
    }
    help = () => {
        const {showHelp} = this
            .state
            this
            .setState({
                showHelp: !showHelp
            })
    }

    render() {
        const {messages} = this.props
        const {lang, showHelp} = this.state
        return (
            <div className={i['warpper']}>
                <span className={i['title']}>
                    {messages['mu_title']}
                </span>
                <div className={i['list']}>
                    {
                        lang == 'ch'
                            ? <img src={chIcon} onClick={this.useEn}/>
                            : <img src={enIcon} onClick={this.useCh}/>
                    }
                    <img onClick={this.help} src={helpIcon}/>
                    <ul className={i['ul']}>
                        <li className={i['divide']}>|</li>
                        <li onClick={this.hide}>—</li>
                        <li className={i['x']} onClick={this.close}>×</li>
                    </ul>
                </div>
                {
                    showHelp
                        ? <div className={i['hcAlert']}>
                                <div className={i['hcHeader']}>
                                    {messages['service']}
                                    <span onClick={this.help} className={i['hcClose']}>×</span>
                                </div>
                                <div className={i['hcTip']}>{messages['zhaot']}zhaot@bell.ai</div>
                            </div>
                        : null
                }
            </div>

        )
    }
}