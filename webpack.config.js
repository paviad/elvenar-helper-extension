const path = require("path");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: {
    main: "./src/index.ts",
    svc: "./src/service-worker.ts",
    popup: "./src/popup.ts",
  },
  mode: "production",
  optimization: {
    // minimize: false,
    usedExports: true,
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
          enforce: true,
        },
      },
    },
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
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: "./assets" }],
    }),
    new webpack.DefinePlugin({
      self: "global",
    }),
    new webpack.ids.HashedModuleIdsPlugin({
      context: __dirname,
      hashFunction: "sha256",
      hashDigest: "hex",
      hashDigestLength: 20,
    }),
  ],
};
