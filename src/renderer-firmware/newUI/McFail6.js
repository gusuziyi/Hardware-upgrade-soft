import React, {Component, Fragment} from 'react';
import s6 from './less/mcFail6.less'
const {toHex}=require('./util/ballUtil')

class McFail6 extends Component {
    constructor(props) {
        super(props)
    }

    render() {
        let startPic=require('./src/start.png')
        let clickIcon=require('./src/click.svg')
        const {currentMcVersion, maxMcVersion,messages} = this.props
        let showcurrentMcVersion=toHex(messages,currentMcVersion)
        return (
            <div className={s6['warper']}>
                <div className={s6['uTitle']}>{/* 主控球固件升级：*/}{messages['l3_mc_up']}</div>

                <div className={s6['uTipGroup']}>
                    <img src={clickIcon} className={s6['click']} alt=""/>
                    <img src={startPic} className={s6['pic']} alt=""/>
                    <div className={s6['uTip']}>{/* 点击主控上的按钮：*/}{messages['l6_mc_click']}</div>
                </div>

                <div
                    className={s6['uVer']}>{/* 当前主控版本：*/}{messages['curr_mc']}{showcurrentMcVersion},{currentMcVersion==maxMcVersion?messages['is_later']:messages['not_later']}</div>
                <span className={s6['uButton']} onClick={() => {
                    this.props.ifMcUp(true)
                }}>{messages['up']}
                </span>
            </div>


        );
    }
}

export default McFail6
