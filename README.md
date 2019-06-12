# Bell IDE for PC
pc版IDE，使用[electron](https://electronjs.org/)打包开发，项目特点是 *html css js* 开发。前端框架采用[React](https://reactjs.org/)，与Mabot Go技术栈一脉相承。还是熟悉的 *wepack react-router react-redux* 等

### 项目搭建手册
从0开始，感谢[How to develop apps in Electron using React](https://willowtreeapps.com/ideas/how-to-develop-apps-in-electron-using-react)

1. `npm init` 根据命令行提示填写，将生成一个 *package.json* 文件
2. 添加依赖库
  - `npm i electron -D` <br/> *electron* 这是个外壳
  - `npm i webpack webpack-cli webpack-dev-server webpack-merge -D` <br/>添加 *webpack* ，和开发用环境
  - `npm i babel-core babel-loader babel-plugin-transform-runtime babel-polyfill babel-preset-env babel-preset-react -D` <br/> *babel* 相关库，根据字母排序加完
  - `npm i ajv -D` <br/>不知道这是什么东西，添加上面的库会有个警告，大概是说这是个配对的库，如果将来这个警告被解决了，是不需要我们手动装的
  - `npm i react react-dom -D` <br/>前端框架
  - `npm i clean-webpack-plugin html-webpack-plugin -D` <br/>webpack各种插件，随着需要会有各种配置
  - `npm i css-loader style-loader less-loader -D` <br/>还是webpack相关，解决css依赖
  - `npm i concurrently -D` <br/>node环境插件，大概就是用来同时跑若干个命令
3. `mkdir src` 源码目录。下面我们将创建两个子目录，一个跑主进程，一个跑渲染进程。渲染进程用 *webpack* 打包管理
4. `cd src && mkdir main renderer`
5. **main** 目录下，主进程文件，就是根据[electron-quick-start](https://github.com/electron/electron-quick-start)copy过来的。唯一注意的就是，开发环境下，渲染进程从本地服务器加载资源(webpack-dev-server的用处)
6. **renderer** 目录下，使用 *webpack* 管理。[另外开讲](#renderer目录)。
7. 添加忽略文件(.gitignore)。各平台与编辑器需要忽略的文件，请大家自行添加

#### 启动项目
项目除了依赖各npm包外，还有scratch。scratch使用git-sumodule管理。下面假设你已经从git仓库把代码拉到本地了。
1. `git submodule update --init --progress` </br>更新各submodule，这个过程可能有点慢，视网速而定。
2. `cd scratch-bell` </br>进入 **scratch-bell** 目录，我们将scratch打包成一个js文件。
3. `npm start && npm run build` </br>总之你需要跑两个命令，在windows平台不一定适用，那就分开跑。你将生成 **dist/pc/blockly/compiled.js** 文件，那么这步成功
4. `cd ../ide4pc` </br>我们回到开发目录
5. `npm install` </br>安装依赖。依赖有很多，慢慢等着。
6. `npm start` </br>这时应该启动了项目。控制台你会看到webpack-dev-server的日志信息，如果成功后，electron白屏，尝试刷新下。mac: cmd + R; win: ctrl + R。
7. **下面是打包相关命令。** 由于electron存在一些native module，我们需要编译下才能使用，electron-rebuild包正是为这个目的存在的,编译环境：nodeV8+、python2.7、C++
8. `npm run rebuild` </br> 这个命令只需要跑一次就行了，因为只需要编译一次
9. `npm run build` </br> 这个命令将 **src** 目录下的源码通过 **webpack** 打包到 **app** 目录下。其实并不是全部，只有 **src/renderer** 目录会处理，**src/main** 我们暂时没有管理
10. `npm run start:prod` </br> 这个命令将 **app** 目录作为electron的启动目录，可以用来测试编译是否成功。
11. `npm run package` </br> 打包项目到 **dist** 目录下。将生成一个桌面版app

#### renderer目录
目标：使用前端框架 **react** ，使用 **webpack** 打包，**webpack-dev-server** 辅助开发，能hot reload，有source map，react-router react-redux等走起。
* 原理分析。开发模式下(process.env.NODE_ENV = development)，使用 **webpack-dev-server** 开一个本地服务器，主进程(src/main/main.js)从本地服务器加载渲染进程文件。生产模式下(process.env.NODE_ENV = production)，使用 **webpack** 打包文件，主进程加载本地文件就行了。
* 生产目录。我们将用 **dist** 目录作为生产目录，供 **electron** 打包App。所以 **webpack** 的输出目录将会是 **dist** 下
* native module。存在某些native module无法使用 **webpack-dev-server**，sqlite3是其中一个。我们写了一个mock文件模拟，sql.js包是其实现

#### node命令简介
* npm start 开发模式下启动本地测试服务器，electron启动应用
* npm run build 生产模式下，用 **webapck** 将 **renderer** 目录打包到 **dist/renderer** 下。（**main** 目录就是简单copy过去的）
* npm run test-server 开发模式启动本地服务器，可以用浏览器看效果
* npm run start:prod 生产模式启动项目。electron从 **dist** 目录启动。
* npm run rebuild 编译native module，只用运行一次
* npm run package 打包app。前提是你需要先 `npm run build` 。**important** 这个命令现在有问题，--ignore 参数没有指定。应该忽略 `src` 目录的，但是有点小问题。这个参数会使用正则匹配，将其他目录中的 `src` 也忽略掉。譬如 node_modules 下面的 debug 包，就会导致运行时错误。
* npm run start:sp 开发调试串口

## NOTE
* electron环境下，存在一些native module，这些包不经过编译，是无法运行的。然后native module是无法在网页上跑的（render process无法运行），所以我们有些mock文件，为了方便开发模式下运行
* 简单解释 **src/renderer/views/app.jsx** ，这个文件有两个同胞，**app.dev.jsx** & **app.prod.jsx** ，看名字可以知道一个是开发环境一个是生产环境。为什么要这么写？js中 `import` 无法条件编译，你不能写这样的代码：
```
import others from 'balabala'
if (process.env.NODE_ENV === 'development') {
  import App from 'app.dev.jsx'
} else {
  import App from 'app.prod.jsx'
}
```
下面的代码也是极度不推荐的

```
import others from 'balabala'
import AppDev from 'app.dev.jsx'
import AppProd from 'app.prod.jsx'

class App extends React.Component {
  render() {
    return (
      <div>
      {
        process.env.NODE_ENV === 'development' ? <AppDev /> : <AppProd />
      }
      </div>
    )
  }
}
```
为什么？因为 **webpack** 会把开发环境的代码编译进生产环境
* 你需要安装ch34x驱动才能正确运行串口通信。mac环境下这个驱动过时了，请从[这里下载](https://github.com/adrianmihalko/ch340g-ch34g-ch34x-mac-os-x-driver)。win版，请去网上搜下吧
* 关于HMR的配置。React使用jsx语法，我们使用[react-hot-loader](https://github.com/gaearon/react-hot-loader)热加载。这个配置按照其文档来就行了。其中，作者说到，source-map的配置有些不一样，为了达到最高效率，使用 `devtool: 'eval'` 的配置。jsx语法被翻译成了js语法。所以如果你想查看原始的jsx语法，你需要改成 `devtool: 'source-map'` 之类。速度真的快很多
* etc...


[查询crc16modbus通信](https://www.23bei.com/tool-232.html)