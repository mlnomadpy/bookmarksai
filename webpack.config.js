const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: 'development',
  entry: './popup.js', // Your source script
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'), // Output directory
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader', // Transpile ES6 code
        },
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "./background.js", to: "background.js" },
        { from: "./content.js", to: "content.js" },
        { from: "./icon.png", to: "icon.png" },
        { from: "./popup.html", to: "popup.html" },
      ],
    }),
  ],

};
