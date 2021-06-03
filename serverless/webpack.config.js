const path = require('path')
const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

const pkg = require('./package.json')

const commitHash = (
  process.env.GITHUB_SHA 
  || require('child_process')
    .execSync('git rev-parse HEAD')
    .toString()
    .replace(/\r?\n|\r/g, '')
)

module.exports = {
  target: 'node',
  mode: 'production',
  entry: {
    app: './src/app.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs',
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  module: {
    rules: [
      {
        test: /\.c?js$/, exclude: /node_modules/, loader: 'babel-loader'
      }
    ]
  },
  resolve: {
    extensions: ['.js'],
    mainFields: ['main'],
  },
  externalsPresets: { node: true },
  plugins: [
    new CleanWebpackPlugin(),
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(`v${pkg.version}-${commitHash}`),
    }),
  ]
}