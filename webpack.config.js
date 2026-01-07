const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const commonOptimization = {
  // minimize: false,
  usedExports: true,
};

const splitChunks = {
  chunks: 'all',
  cacheGroups: {
    vendor: {
      test: /[\\/]node_modules[\\/]/,
      name: 'elvenassist-vendors',
      chunks: 'all',
      enforce: true,
    },
  },
};

const commonConfig = (env) => ({
  mode: 'production',
  optimization: commonOptimization,
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
    path: path.resolve(__dirname, env.firefox ? 'dist-firefox' : 'dist'),
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
});

module.exports = (env) => [
  {
    entry: {
      'elvenassist-overlay': './src/overlay.ts',
      'elvenassist-tab': './src/tab.ts',
      popup: './src/popup.ts',
      'elvenassist-inject': './src/inject/inject-main.ts',
    },
    ...commonConfig(env),
    optimization: {
      ...commonOptimization,
      splitChunks,
    },
  },
  {
    entry: {
      'elvenassist-service-worker': './src/service-worker/svc.ts',
    },
    ...commonConfig(env),
    optimization: {
      ...commonOptimization,
    },
  },
];
