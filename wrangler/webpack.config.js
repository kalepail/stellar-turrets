const path = require('path')
const webpack = require('webpack')
const GitRevisionPlugin = require('git-revision-webpack-plugin')

const pkg = require('./package.json')

const gitRevisionPlugin = new GitRevisionPlugin()

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  target: 'webworker',
  module: {
    rules: [
      {
        test: /\.c?js$/, exclude: /node_modules/, loader: 'babel-loader'
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(`v${pkg.version}-${gitRevisionPlugin.commithash()}`),
    }),
    new webpack.ProvidePlugin({
      window: path.resolve(path.join(__dirname, 'src/@utils/window')),
    }),
  ]
}