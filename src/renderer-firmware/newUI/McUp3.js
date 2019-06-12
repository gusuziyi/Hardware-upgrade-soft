import React, {Component, Fragment} from 'react';
import  s3 from './less/mcUp3.less'
const {toHex}=require('./util/ballUtil')
class  McUp3 extends  Component{
    constructor(props){
        super(props)
        this.state={
            showAlert:false,
        }
    }

    upgrade=()=>{
        //TO is latest version
        const {ifMcUp,currentMcVersion,maxMcVersion}=this.props
        if(maxMcVersion==currentMcVersion){
            this.setState({
                showAlert:true
            })
            return
        }
        //Not new ver ,call native upgrade
        ifMcUp(true)
    }
	hideAlert=()=>{
		 this.setState({
		    showAlert:false
		})
	}
    render(){
        const {showAlert}=this.state
        const {currentMcVersion,maxMcVersion}=this.props
        const {messages}=this.props
        const ShowNoLink=()=> <div className={s3['uVer']}>{/* 请检查主控是否已连接：*/}{messages['l3_ifmc_conn']}</div>
        let showcurrentMcVersion=toHex(messages,currentMcVersion)

        const ShowMCVersion=()=> <div className={s3['uVer']}>
           {/* 当前主控版本：*/}{messages['curr_mc']}{showcurrentMcVersion},{currentMcVersion==maxMcVersion?messages['is_later']:messages['not_later']}</div>
        let startPic=require('./src/start.png')
        return (
            <div className={s3['warper']}>
                <span onClick={() => {
                    this.props.backToHome()
                }} className={s3['back']}>  </span>
                <div className={s3['uTitle']}>{/* 主控球固件升级：*/}{messages['l3_mc_up']}</div>
                <img src={startPic} className={s3['pic']} alt=""/>
                <div className={s3['uTip']}>{/* 请按如上图使用USB线连接Mabot：*/}{messages['l3_usb_must']}</div>
                <span className={s3['uButton']} onClick={()=>{this.upgrade()}}>{/*升级*/}{messages['up']}</span>
                {currentMcVersion<0?<ShowNoLink/>:<ShowMCVersion/>}
                {showAlert?<div className={s3['hAlert']}>
                        <div  className={s3['hHeader']}>
                            {/*提示*/} {messages['tips']}
                            <span onClick={this.hideAlert} className={s3['hClose']}>×</span>
                        </div>
                        <div className={s3['hTip']}>{/*当前主控球固件已经是最新版本，无需升级。*/}{messages['l3_mc_islater']}</div>
                        <div className={s3['uButton']} onClick={ this.hideAlert}>{/*确定*/}{messages['yes']}</div>
                </div>:null}
            </div>
        );
    }
}

export  default  McUp3
