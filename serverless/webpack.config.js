const webpack = require('webpack')
const slsw = require('serverless-webpack')
const TerserPlugin = require('terser-webpack-plugin')
const nodeExternals = require('webpack-node-externals')

const pkg = require('./package.json')

const isLocal = slsw.lib.webpack.isLocal

const commitHash = (
  process.env.GITHUB_SHA 
  || require('child_process')
    .execSync('git rev-parse HEAD')
    .toString()
    .replace(/\r?\n|\r/g, '')
)

module.exports = {
  mode: isLocal ? 'development' : 'production',
  entry: slsw.lib.entries,
  target: 'node',
  devtool: isLocal ? 'source-map' : false,
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  externalsPresets: { 
    node: true 
  },
  externals: [
    nodeExternals(),
    /aws-sdk/
  ],
  module: {
    rules: [
      {
        test: /\.c?js$/, exclude: /node_modules/, loader: 'babel-loader'
      }
    ]
  },
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(`v${pkg.version}-${commitHash}`),
    }),
  ]
}