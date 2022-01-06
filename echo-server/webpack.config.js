const path = require('path');
const process = require('process');
require('dotenv').config();

const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
module.exports = {
  mode: process.env.NODE_ENV || 'production',
  devServer: {
    host: 'localhost',
    port: 8080,
    proxy: {
      '/': 'http://localhost:3000',
    },
  },
  entry: path.resolve(__dirname, 'client/index.js'),
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js',
  },
  plugins: [
    new HtmlWebpackPlugin({ template: 'index.html' }),
    new MiniCssExtractPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.[tj]sx?$/i,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      {
        test: /\.s?[ac]ss$/i,
        exclude: /node_modules/,
        use: [
          process.env.NODE_ENV === 'production'
            ? MiniCssExtractPlugin.loader
            : 'style-loader',
          'css-loader',
          'sass-loader',
        ],
      },
    ],
  },
};
