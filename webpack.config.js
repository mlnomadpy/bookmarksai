const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: 'development',
  entry: {
    popup: './popup.js',
    background: './background.js',
    content: './content.js',
    offscreen: './offscreen.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "./icon.png", to: "icon.png" },
        { from: "./popup.html", to: "popup.html" },
        { from: "./offscreen.html", to: "offscreen.html" },
        { from: "./manifest.json", to: "manifest.json" },
      ],
    }),
  ],
};