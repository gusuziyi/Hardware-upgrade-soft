import React, {Component, Fragment} from 'react';
import s8 from './less/ballOnUp8.less'
import Progress from "./progress";
const {tips,enname,indexes,getCheckedBallname,toHex}=require('./util/ballUtil')
import  c from 'classnames'
let _NativeTimer=null
class BallOnUp8 extends Component {
    constructor(props) {
        super(props)
        this.state = {
            progress: 0,
            giveUpBallUpgrade: false,
            ballUpFailTime:0
        }
    }

    upgradeBall() {
        const {spManager, selected,ballUpFailTime} = this.props
console.log('upball',spManager, selected,ballUpFailTime);
const {currentMcVersion, maxMcVersion, ballVersion, ballIsNewestVersion, ballName} = this.props
console.log(currentMcVersion, maxMcVersion, ballVersion, ballIsNewestVersion,ballName,selected)

        spManager.upgradeModule(selected,
            () => {
                console.log('[Upgrade Module Started]: ', selected);
            },
            (p) => {
                if (p < 1) return;
                this.setState({progress: p});
                console.log('[Upgrade Module Prorgess]: ', p);
            },
            () => {
                if(!_NativeTimer){
                    _NativeTimer=setInterval(()=>{
                        const{progress}=this.state
                        this.setState({progress:progress+1})
                        if(progress==100){
                            clearInterval(_NativeTimer)
                            _NativeTimer=null
                        }
                    },300)
                }
                setTimeout(() => {
                    this.setState({
                        progress: 0,
                    });
                    this.ifUpBallDone(true)
                }, 3* 1000);
            },
            (err) => {
                // 失败, >6 give up upsgrade
                if (ballUpFailTime > 6) {
                    this.setState({
                        giveUpBallUpgrade: true
                    })
                    return
                }
                // 失败, <6 go on upgrade, else show contact customer service;
                console.log('[Upgrade Module Failed]: ', err);
                this.setState({
                    ballUpFailTime:ballUpFailTime+1,
                    progress: 0,
                });
                this.upBallIsFeilAndWillGoOn(ballUpFailTime+1)


            });
    
}
    upBallIsFeilAndWillGoOn=(ballUpFailTime)=>{
         this.props.upBallIsFeilAndWillGoOn(ballUpFailTime)
    }
    ifUpBallDone = (ifBallDone) => {
        this.props.ifUpBallDone(ifBallDone)
    }

    componentDidMount() {
        const {ballUpFailTime}=this.props
        this.setState({ballUpFailTime})
        this.upgradeBall()
    }

    failOver6 = () => {
        this.props.failOver6()
    }

    render() {
        const {progress, giveUpBallUpgrade} = this.state
        const {currentMcVersion, maxMcVersion, ballVersion, ballIsNewestVersion, ballName,selected} = this.props
        const {messages} = this.props
        let {ballEnName, ballChName} = getCheckedBallname(messages,selected)
        let uerCheckBallPic = require('./src/frantBall/' + ballEnName + '.png')
        let connBase = require('./src/connBase.png')
        let showcurrentMcVersion=toHex(messages,currentMcVersion)
        let showballVersion=toHex(messages,ballVersion)
        return (
            <div className={s8['warper']}>
                <div className={s8['uTitle']}>{/*正在升级*/}{messages['l8_is_uping']}{ballChName}{/*固件*/}{messages['firm']}</div>
                <div className={s8['pic']}>
                    <img src={uerCheckBallPic} className={c(s8['userPickPic'], s8[ballEnName])} alt=""/>
                    <img src={connBase} alt=""/>
                </div>
                <div className={s8['uWarning']}>
                    <p>{/*升级过程中不可关闭软件，不可插拔模块，不可关闭电源，不可与主控断开连接！*/}{messages['l4_not_shutdown']} </p>
                    <p>{/*上述操作会导致主模块无法使用。*/}{messages['l4_not_work']} </p>
                </div>
                <Progress  percentageNum={progress} progressName='安装进度' />
                <div className={s8['uVer']}>
                    <div
                    >{/* 当前主控版本：*/}{messages['curr_mc']}{showcurrentMcVersion},{currentMcVersion==maxMcVersion?messages['is_later']:messages['not_later']}</div>
                    <div
                        className={s8['uVer2']}>{/*当前*/}{messages['curr']}{ballName}{/*版本：*/}{messages['vers']}{showballVersion},{ballIsNewestVersion ? messages['is_later']:messages['not_later']}</div>
                </div>

                {giveUpBallUpgrade?<div className={s8['hAlert']}>
                    <div  className={s8['hHeader']}>
                        {/*提示*/} {messages['tips']}
                    </div>
                    <div className={s8['hTip']}>  {/*升级失败，请联系客服*/} {messages['l8_up_fail']}</div>
                    <div className={s8['uButton']} onClick={ () =>  this.failOver6()}>{/*确定*/}{messages['yes']}</div>
                </div>:null}
            </div>

        ) ;
    }
}

export default BallOnUp8
