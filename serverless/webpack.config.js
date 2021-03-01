const path = require('path')
const webpack = require('webpack')

const pkg = require('./package.json')

const commitHash = (
  process.env.GITHUB_SHA 
  || require('child_process')
    .execSync('git rev-parse HEAD')
    .toString()
    .replace(/\r?\n|\r/g, '')
)

module.exports = {
  mode: 'production',
  optimization: {
    minimize: true
  },
  // mode: 'development',
  // devtool: false,
  entry: {
    app: './src/app.js',
  },
  output: {
    libraryTarget: 'commonjs-module',
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  target: 'node',
  externalsPresets: { node: true },
  resolve: {
    extensions: ['.js'],
    mainFields: ['main'],
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
    })
  ]
}