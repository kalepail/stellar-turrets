const path = require('path')
const webpack = require('webpack')
const nodeExternals = require('webpack-node-externals')

const pkg = require('./package.json')

const commitHash = (
  process.env.GITHUB_SHA 
  || require('child_process')
    .execSync('git rev-parse HEAD')
    .toString()
)

module.exports = {
  mode: 'production',
  entry: {
    app: './src/app.js',
  },
  output: {
    libraryTarget: 'commonjs-module',
    path: path.resolve(__dirname),
    filename: '[name].js',
  },
  target: 'node',
  externals: [nodeExternals()],
  optimization: {
    minimize: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        include: __dirname,
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(`v${pkg.version}-${commitHash}`),
    }),
  ]
}