#开发文档
1. 安装步骤：
* git clone '项目地址' && npm install
* 串口连接程序是C++模块，使用之前需要编译，electron-rebuild包正是为这个目的存在的
* 基本编译环境：node 8.0+、pyton2.7、C++、electron-rebuild 1.5 electron 1.5 serialport 4.0.7
* 串口通信协议为sr232,crc校验为crc16/modbus规则,可以根据硬件指令直接对硬件进行测试,[modbus规则生成器](https://www*23bei.com/tool-232.html)
* 项目指令
    - npm install 安装所需依赖(安装前要保证基本编译环境配置正确)
	- npm run rebuild  编译串口文件
	- npm run start:firmware  调试模式
	- npm run build:firmware  生产调试
	- npm run pack:firmware_win 打包成window软件
	- npm run pack:firmware_mac 打包成mac软件
2. 项目结构:
* newUI:前端界面,基本思路是在newRepair.js中维护一个路由,并管理所有状态和所有页面跳转,第一次写react,状态管理写的比较复杂,不太好追踪,之后如果有时间的话我准备引入dva框架将页面状态重构成模块化
* assets:资源目录,electron渲染进程看起来是前端,实际上要使用node语法,尤其是路径解析这里,
* redux是语言环境,目前支持中文和英文
* 程序有两个入口,index和newRepair,index是bell.ai启动logo,newRepair是主入口,主入口在一秒钟后会自动覆盖index
* serialport为通信接口逻辑,使用异步串行通信,详见下方.
3. 底层通信逻辑:
* 上述通信接口编译成功后,调用上分为通信管理,通信数据传输和通信指令
* 通信指令:在cmd.js中定义,分为req和res,并根据硬件提供的指令集进行封装与crc校验
* 通信管理:在sp中定义,创建SP实例后开始轮询,启动看门狗并加载相关通信插件,默认是cmdControl
* 通信数据传输:传输使用插件方式实现,目前有cmdControl(命令管理)与fileTransfer(大文件传输:分段切片)
* 一次完整的通信过程:在前端发生交互后,首先进入native.js找到对应软件指令,然后将软件指令和回调传给cmdControl,cmdControl调用cmd把native传来命令解析成硬件指令,截取指令头部,使用路由算法将指令头部与回调绑定,计算帧头,帧体和crc,封装之后发送,硬件返回之后解析帧头并触发回调,在回调中解析帧体,在没有丢包,溢出,crc错误时触发回调,数据返回到native,native进行业务处理后将数据返回前端
* 主进程IPC只能发送消息,想要广播要使用getFocusWindow().webContents.send,所以如果是有IPC管理的多个子进程通信请使用LocalStorage
4. 从0开始搭建项目:
* `npm init` 生成一个 *package.json* 文件
* 添加依赖库
  - `npm i electron -D` *electron* 这是个外壳
  - `npm i webpack webpack-cli webpack-dev-server webpack-merge -D` 添加 *webpack* 
  - `npm i babel-core babel-loader babel-plugin-transform-runtime babel-polyfill babel-preset-env babel-preset-react -D` *babel* 相关库，babel-loader是webpack插件,polyfill是兼容es5特殊函数的语法库,preset-env是通用语法包,把这些加上es6就可以随便写了
  - `npm i react react-dom -D` 前端框架
  - `npm i clean-webpack-plugin html-webpack-plugin -D` webpack各种插件
  - `npm i css-loader style-loader less-loader -D` webpack各种插件，解决css依赖
* `mkdir src` 源码目录。下面我们将创建两个子目录，一个跑主进程，一个跑渲染进程。渲染进程用 *webpack* 打包管理
* `cd src && mkdir main renderer`
* **main** 目录下，主进程文件，就是根据[electron-quick-start](https://github.com/electron/electron-quick-start)copy过来的。唯一注意的就是，开发环境下，渲染进程从本地服务器加载资源(webpack-dev-server的用处)
* 添加忽略文件(.gitignore)

5. v0.8版本的bug
* mac系统下,在启动软件之前连接主控,较大几率无法识别主控,并在后台报`Error Resource temporarily unavailable Cannot lock port`错误(用户不可见),这是unix设备安全机制造成的.解决方案:拔下主控重新连接
* mac系统下,启动软件后在系统扫描串口且没有扫到的情况下,强行插拔主控,较小几率会造成系统崩溃.解决方案:先开软件,再插主控
* 在已连接一个功能球并不能识别,选择主控降级后,在降级过程<60%之前,如果再接入能够被降级前主控识别的功能球,极大几率造成降级失败,在降级过程>60%后,一定概率造成降级失败.解决方案:只连一个球,并重新降级
* 软件只能识别一个主控的版本,若同时插了两个主控,且对其中一个有过升级或降级操作,此时切换到另一个主控,此时主控版本必定不能识别,一定概率不能识别该主控,若能识别则该主控功能不受影响(仅版本号显示有问题).这样设计的原因参见前两条.解决方案:最好只连接一个主控

6. v1.0版本的对bug的修复方案
* mac系统下,在启动软件之前连接主控无法识别,以及热插拔会崩溃的问题:启动软件时建立一个模拟串口(全局变量SP,始终不会销毁)出来,启动扫描,将扫到的mabot添加到SP中,设置看门狗,当发现热插拔和串口扫描程序飞掉的时候,强行为SP重启串口扫描,这样不仅可以检测到反复热插拔,即使拔线换其它接口也能扫描到.
* 在主控降级时插拔功能球造成降级失败:当升级时屏蔽对外监听,所有消息均不响应,在估计主控可能降级完成后,开启硬件轮询,若一段时间内没有返回,认为主控已经变砖
* 软件只能识别一个主控的版本的问题:由于使用了虚拟串口,该问题不复存在