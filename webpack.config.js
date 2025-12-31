const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const commonConfig = {
  mode: 'production',
  optimization: {
    // minimize: false,
    usedExports: true,
  },
  performance: {
    hints: false,
  },
  stats: {
    orphanModules: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs2',
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: './assets' }],
    }),
    new webpack.DefinePlugin({
      self: 'global',
    }),
    new webpack.ids.HashedModuleIdsPlugin({
      context: __dirname,
      hashFunction: 'sha256',
      hashDigest: 'hex',
      hashDigestLength: 20,
    }),
  ],
};

module.exports = [
  {
    ...commonConfig,
    entry: {
      main: './src/index.ts',
      tab: './src/tab.ts',
      popup: './src/popup.ts',
    },
    optimization: {
      ...commonConfig.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            enforce: true,
          },
        },
      },
    },
  },
  {
    ...commonConfig,
    entry: {
      svc: './src/service-worker.ts',
    },
  },
];
