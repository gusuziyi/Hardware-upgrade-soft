'use strict';

const path = require('path');
const webpack = require('webpack');

// plugins
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const SpritesmithPlugin = require('webpack-spritesmith');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const NodeExternalsPlugin = require('webpack-node-externals');

process.env.DEBUG = process.env.DEBUG || true
process.env.NODE_ENV = process.env.NODE_ENV || 'development'

module.exports = {
  context: __dirname,

  devServer: {
    contentBase: path.resolve(__dirname, '../../app/renderer-firmware'),
    host: '0.0.0.0',
    port: process.env.PORT || 9999
  },

  devtool: JSON.parse(process.env.DEBUG) ? 'cheap-module-source-map' : 'none',

  entry: {
    index: path.resolve(__dirname, 'index.js'),
    newRepair: path.resolve(__dirname, 'newRepair.js')

  },

  output: {
    path: path.resolve(__dirname, '../../app/renderer-firmware'),
    filename: '[name].bundle.js',
    libraryTarget: 'commonjs2'
  },

  resolve: {
    modules: [ 'node_modules', 'spritesmith-generated' ]
  },

  target: 'electron-renderer',
  externals: {
    serialport: 'serialport'
  },

  module: {
    rules: [
      {
        test: /\.(jsx|js)?$/,
        loader: 'babel-loader',
        include: __dirname,
        query: {
          presets: ['babel-preset-env', 'babel-preset-react'],
          plugins: [
            'transform-runtime',
            'transform-class-properties',
            'transform-object-rest-spread'
          ],
          cacheDirectory: true
        }
      },
      {
        test: /\.(png|jpg|gif|svg|ico)$/,
        loader: 'url-loader',
        options: {
          limit: 100000,
          name: './assets/images/[hash].[ext]'
        }
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true,
              camelCase: true,
              sourceMap: true,
              localIdentName: '[path][name]__[local]--[hash:base64:5]'
            }
          }
        ]
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 1000000,
        },
      },
      {

        test: /\.less$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true,
              camelCase: true,
              sourceMap: true,
              localIdentName: '[path][name]__[local]--[hash:base64:5]'
            }
          }, 'less-loader'
        ]
      },
      {
        test: /\.(bin|EXE|pkg)$/,
        loader: 'file-loader'
      }
    ]
  },

  plugins: [
    new CleanWebpackPlugin([ 'app/renderer-firmware' ], {
      root: path.resolve(__dirname, '../..')
    }),

    new webpack.DefinePlugin({
      'process.env.NODE_ENV': '"' + process.env.NODE_ENV + '"',
      'process.env.DEBUG': JSON.parse(process.env.DEBUG),
      $dirname: '__dirname',
    }),

    new webpack.HotModuleReplacementPlugin(),

    new SpritesmithPlugin({
      src: {
        cwd: path.resolve(__dirname, 'assets/images/'),
        glob: '*.png'
      },

      target: {
        image: path.resolve(__dirname, 'assets/sprites/sprite-0.png'),
        css: path.resolve(__dirname, 'assets/css/sprite-0.css')
      },

      apiOptions: {
        cssImageRef: '../sprites/sprite-0.png'
      }
    }),

    new HtmlWebpackPlugin({
      chunks: [ 'index' ],
      template: './index.ejs',
      title: 'Mabot固件升级工具',
      filename: 'index.html'
    }),


    new HtmlWebpackPlugin({
      chunks: ['newRepair'],
      template: './index.ejs',
      title: 'Mabot固件升级工具',
      filename: 'newRepair.html'
    }),


    new CopyWebpackPlugin([{
      from: './native.js'
    }, {
      from: './main.js'
    }])
  ]
};
