import React, {Component} from 'react';

import  PropTypes from 'prop-types';
import p from './less/progress.less'
import  c from  'classnames'

export default class Progress extends Component {
    static propTypes = {
        percentageNum: PropTypes.number,
        allNum: PropTypes.number,
        progressName: PropTypes.string
    };
    constructor(props) {
        super(props)
    }

    render() {
        let percentageNum = (this.props.percentageNum);
        let leftPercentage = (100-this.props.percentageNum)*(-1);
        let {isupMode,isDownFirm}=this.props
        let progress = {
            left:`${leftPercentage}%`,
        };

        return (
            <div className={c(p['bgroud'],p[isupMode])}>

                <div style={progress} className={c(p['goon'],p[isupMode],p[isDownFirm])}></div>
                <div className={p['num']}>
                    {percentageNum}%
                </div>

            </div>
        )
    }
}
