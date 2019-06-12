import React, {Component, Fragment} from 'react';
import s2 from './less/choose2.less'
class Choose2 extends Component {
    constructor(props) {
        super(props)
    }

    emitChoosed = (ballName) => {
        this.props.getChoosed(ballName)
    }

    render() {
        let color1 = require("./src/ball/color1.png")
        let mc1 = require("./src/ball/mc1.png")
        let arm1 = require("./src/ball/arm1.png")
        let dr1 = require("./src/ball/dr1.png")
        let ir1 = require("./src/ball/ir1.png")
        let touch1 = require("./src/ball/touch1.png")
        let waist1 = require("./src/ball/waist1.png")
        const {messages}=this.props
        return (
            <div className={s2['warper']}>
                <div className={s2['uTip']}>{/*选择要升级的球*/}{messages['l2_choose']}</div>
                <div className={s2['ballList']}>
                    <div className={s2['list1']}>
                        <img src={mc1} className={s2['pic']} onClick={() => this.emitChoosed('MC')}/>
                        <img src={waist1} className={s2['pic']}
                             onClick={() => this.emitChoosed(SPManager.MODULE_WAIST)}/>
                        <img src={arm1} className={s2['pic']} onClick={() => this.emitChoosed(SPManager.MODULE_ARM)}/>
                        <img src={dr1} className={s2['pic']} onClick={() => this.emitChoosed(SPManager.MODULE_DRIVER)}/>
                    </div>
                    <div className={s2['list2']}>
                        <img src={color1} className={s2['pic']}
                             onClick={() => this.emitChoosed(SPManager.MODULE_COLOR)}/>
                        <img src={touch1} className={s2['pic']}
                             onClick={() => this.emitChoosed(SPManager.MODULE_TOUCH)}/>
                        <img src={ir1} className={s2['pic']}
                             onClick={() => this.emitChoosed(SPManager.MODULE_INFRARED)}/>
                    </div>
                </div>
            </div>
        );
    }
}

export default Choose2
