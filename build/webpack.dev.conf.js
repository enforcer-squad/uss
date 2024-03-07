const webpack = require('webpack');
const ESLintPlugin = require('eslint-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { merge } = require('webpack-merge');
const { resolve, getCssLoaders, getEntries } = require('./utils');
const baseConfig = require('./webpack.base.conf');

const { entries, htmlPlugins } = getEntries();

const devConfig = merge(baseConfig, {
  experiments: {
    lazyCompilation: true,
  },
  entry: {
    ...entries,
  },
  devServer: {
    port: 2346,
    hot: true,
    host: '0.0.0.0',
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
    historyApiFallback: {
      disableDotRule: true,
    },
    proxy: {
      '/pd-api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // pathRewrite: {
        //   '^/xxx': '/',
        // },
      },
    },
  },
  module: {
    rules: getCssLoaders(),
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new ReactRefreshWebpackPlugin(),
    new ESLintPlugin(),
    // new CopyWebpackPlugin({
    //   patterns: [
    //     {
    //       from: resolve('src/public'),
    //       to: resolve(`dist/${config[process.env.BUILD_ENV].SUB_DIR}`),
    //     },
    //   ],
    // }),
    ...htmlPlugins,
  ],
});

module.exports = devConfig;
