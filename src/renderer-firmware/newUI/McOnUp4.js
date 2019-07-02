import React, {Component, Fragment} from 'react';
import  s4 from './less/mcOnUp4.less'
const {toHex}=require('./util/ballUtil')
import Progress from './progress';
let _timer=null,_NativeTimer=null
class  McOnUp4 extends  Component{
    constructor(props){
        super(props)
        this.state={
            fail:false,
            progress:0,
            currentMcVersion:-1, //for rewrite the new version ,so there let a state for catch
            maxMcVersion:-1,  //for rewrite the new version ,so there let a state for catch
            showMayBeFail:false
        }
    }
    upgrade=(maxMcVersion)=>{
        const {spManager}=this.props
		console.log(1111435345,spManager,maxMcVersion)
        spManager.upgrade(
            () => {
                console.log('[Upgrade MC Started]: ');
                this.setState({progress: 1});
            },
            (p) => {
                if (p < 1) return;
                this.setState({progress: p});
                console.log('[Upngrade MC Prorgess]: ', p);
            },
            () => {
                console.log('all in 5555')
               if(!_NativeTimer){
                   _NativeTimer=setInterval(()=>{
                      const{progress}=this.state
                      this.setState({progress:progress+1})
                       if(progress==100){
                           clearInterval(_NativeTimer)
                           _NativeTimer=null
                       }
                   },1000)
               }
                setTimeout(() => {
                    this.setState({
                        progress: 0,
                        currentMcVersion:maxMcVersion
                    });
                    this.ifUpMcDone(true)
                }, 45 * 1000);
            },
            () => {
                console.log('[Upngrade MC Fail]: ');
            },
            maxMcVersion
        );
    }
    componentDidMount() {
        const {currentMcVersion,maxMcVersion,mcIsStock}=this.props
        console.log(currentMcVersion,maxMcVersion)
        this.setState({
            currentMcVersion,
            maxMcVersion
        });

        if(mcIsStock){
            this.semulateUpdate()
        }else{
            this.upgrade(maxMcVersion)
        }





    }
    semulateUpdate=()=>{
        const {maxMcVersion}=this.props
        if(!_timer){
            _timer=setInterval(()=>{
                const {progress:p}=this.state
                if(p==100){
                    this.setState({
                        progress: 0,
                        currentMcVersion:maxMcVersion
                    });
                    clearInterval(_timer)
                    _timer=null
                    this.props.iAmStock(false)
                    this.ifUpMcDone(true)
                }
                if(p<100)
                    this.setState({progress: p+1})
            },480)
        }
    }
    ifUpMcDone=(ifDone)=>{
        this.props.ifUpMcDone(ifDone)
    }
    hideAlert=()=>{
        this.setState({
            showAlert:false
        })	
    }
    closeFail=()=>{
        this.setState({
            showMayBeFail:false
        })
    }


    render(){
        const {fail,progress,currentMcVersion,maxMcVersion,showMayBeFail}=this.state
        const {messages}=this.props
        let startPic=require('./src/start.png')
        let showcurrentMcVersion=toHex(messages,currentMcVersion)
        return (
            <div className={s4['warper']}>
                <div className={s4['uTitle']}>{/*正在升级主控球固件*/}{messages['l4_is_uping_mc']}</div>
                <img src={startPic} className={s4['pic']} alt=""/>
                <div className={s4['uWarning']}>
                    <p>{/*升级过程中不可关闭软件，不可插拔模块，不可关闭电源，不可与主控断开连接！*/}{messages['l4_not_shutdown']} </p>
                    <p>{/*上述操作会导致主模块无法使用。*/}{messages['l4_not_work']} </p>
                </div>
                <Progress  percentageNum={progress} progressName='安装进度' />
                <div className={s4['uVer']}> {/* 当前主控版本：*/}{messages['curr_mc']}{showcurrentMcVersion}{currentMcVersion==maxMcVersion?messages['is_later']:messages['not_later']}</div>
                {fail?<div className={s4['hAlert']}>
                    <div  className={s4['hHeader']}>
                       {/*提示*/} {messages['tips']}
                        <span onClick={this.hideAlert} className={s4['hClose']}>×</span>
                    </div>
                    <div className={s4['hTip']}>{/*当前主控球固件已经是最新版本，无需升级。*/}{messages['l3_mc_islater']}</div>
                    <div className={s4['uButton']} onClick={ this.hideAlert}>{/*确定*/}{messages['yes']}</div>
                </div>:null}
                {showMayBeFail?<div className={s4['hAlert']}>
                    <div  className={s4['hHeader']}>
                       {/*提示*/} {messages['tips']}
                        <span onClick={this.closeFail} className={s4['hClose']}>×</span>
                    </div>
                    <div className={s4['hTip']}>
                       {/* 本次升级可能会失败,稍后软件会自动重新升级*/} {messages['l4_may_fail']} </div>
                    <div className={s4['uButton']} onClick={ this.closeFail}>{/*确定*/}{messages['yes']}</div>
                </div>:null}
            </div>
        );
    }
}

export  default  McOnUp4
