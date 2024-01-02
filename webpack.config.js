const path = require('path');

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
};
