import React, {Component, Fragment} from 'react';
import s9 from './less/ballDone9.less'

const {tips, enname, indexes,getCheckedBallname,toHex} = require('./util/ballUtil')

class BallDone9 extends Component {
    constructor(props) {
        super(props)
    }

    componentDidMount() {
		const {spManager,messages,selected}=this.props
		let {ballChName} = getCheckedBallname(messages, selected)
		spManager.fetchVersionSingleModule(selected, 1, (ballVersion) => {
			this.props.updateCurrVersion({
				which:'ball',
				v:ballVersion
			})
		    console.log('ballVersion--reall', ballVersion)
		})
        setTimeout(this.props.backToHome,5000)
    }

    render() {
        const {currentMcVersion, maxMcVersion, ballName, ballVersion, ballIsNewestVersion, selected} = this.props
        let yesIcon = require('./src/yes.png')
        const {messages} = this.props
        let {ballEnName, ballChName} = getCheckedBallname(messages,selected)
        let uerCheckBallPic = require('./src/ball/' + ballEnName + '.png')
        let showcurrentMcVersion=toHex(messages,currentMcVersion)
        let showballVersion=toHex(messages,ballVersion)
        return (
            <div className={s9['warper']}>
                <img src={uerCheckBallPic} className={s9['pic']} alt=""/>
                <div className={s9['uTip']}>
                    <img src={yesIcon}/>{ballChName}{/*升级成功，5秒后返回*/}{messages['l9_is_done']}
                </div>
                <span className={s9['uButton']} onClick={() => {
                    this.props.backToHome()
                }}>{/*返回首页*/}{messages['to_home']}</span>
                <div className={s9['uVer']}>
                    <div >{/* 当前主控版本：*/}{messages['curr_mc']}{showcurrentMcVersion},{currentMcVersion==maxMcVersion?messages['is_later']:messages['not_later']}</div>
                    <div >{/*当前*/}{messages['curr']}{ballName}{/*版本：*/}{messages['vers']}0501,{messages['is_later']}</div>
                </div>
            </div>
        );
    }


}

export default BallDone9
