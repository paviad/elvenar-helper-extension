const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebpackManifestPlugin = require('webpack-manifest-plugin').WebpackManifestPlugin;

const commonOptimization = (env) => ({
  minimize: !!env.production,
  usedExports: true,
  chunkIds: 'deterministic',
});

const splitChunks = {
  chunks: 'all',
  cacheGroups: {
    vendor: {
      test: /[\\/]node_modules[\\/]/,
      name: 'elvenassist-vendors',
      chunks: 'all',
      enforce: true,
    },
    // Our own code reached from more than one entry. This overrides webpack's built-in `default`
    // group, keeping its behaviour and only giving its chunks names: an unnamed chunk is filed
    // under a number hashed from the modules inside it, so the filename moved whenever the shared
    // set changed, and the manifests and pages that name the file silently went stale.
    //
    // The name is built from the entries sharing the module rather than being one fixed string.
    // A single name would pull every shared module into one chunk, so an entry that shares one
    // small module would have to load all of them - dragging the React widgets into the script
    // injected into the game page, among other things. Naming them this way keeps the split
    // exactly as it was and says who each chunk is for.
    default: {
      name: (_module, chunks) =>
        'elvenassist-shared-' +
        chunks
          .map((chunk) => chunk.name)
          .filter(Boolean)
          .map((name) => name.replace(/^elvenassist-/, ''))
          .sort()
          .join('-'),
      minChunks: 2,
      priority: -20,
      reuseExistingChunk: true,
    },
  },
};

/**
 * Writes the modules of each named chunk to chunk-modules.json beside the bundles.
 *
 * Which modules end up shared between entries is worth knowing about: a module arriving in the
 * common chunk means something is now reached from two entries that was not before, which is
 * either deliberate or an import that crossed a boundary it should not have.
 */
class RecordChunkModulesPlugin {
  constructor({ fileName }) {
    this.fileName = fileName;
  }

  apply(compiler) {
    compiler.hooks.done.tap('RecordChunkModules', (stats) => {
      // nestedModules and dependentModules matter: without them a module reached only from
      // another module in the same chunk is folded into its parent and never listed, which
      // hides most of what is actually in there.
      const { chunks } = stats.toJson({
        all: false,
        chunks: true,
        chunkModules: true,
        nestedModules: true,
        dependentModules: true,
      });
      const byChunk = {};

      // A stats module can stand in for several - concatenated together, or only reachable
      // through it - so every level is walked.
      const flatten = (modules) => (modules || []).flatMap((m) => [m, ...flatten(m.modules)]);

      for (const chunk of chunks) {
        const name = (chunk.names || [])[0];
        if (!name) {
          continue;
        }
        const names = flatten(chunk.modules)
          .map((m) => m.name)
          .filter((n) => n && !n.startsWith('data:'));
        byChunk[name] = [...new Set(names)].sort();
      }

      const outPath = path.join(compiler.outputPath, this.fileName);
      fs.mkdirSync(compiler.outputPath, { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(byChunk, null, 2), 'utf8');
    });
  }
}

// Both compilers write to the same directory, so the file each one records its entries in has to
// differ - otherwise whichever finishes last is the only one you get.
const commonConfig = (env, { manifestFileName }) => ({
  mode: 'production',
  node: false,
  optimization: commonOptimization(env),
  devtool: env.production ? false : 'source-map',
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
    // new webpack.optimize.LimitChunkCountPlugin({
    //   maxChunks: 1,
    // }),
    new WebpackManifestPlugin({
      fileName: manifestFileName,
      generate: (seed, files, entries) => {
        return entries;
      },
    }),
  ],
});

module.exports = (env) => [
  {
    entry: {
      'elvenassist-overlay': './src/overlay.ts',
      'elvenassist-overlay-inject': './src/inject.ts',
      'elvenassist-tab': './src/tab.ts',
      popup: './src/popup.ts',
      'elvenassist-inject': './src/inject/inject-main.ts',
      'elvenassist-spirewizard': './src/spirewizard/spirewizard-main.ts',
      'elvenassist-spirewizard-inject': './src/spirewizard/spirewizard-inject.ts',
    },
    ...commonConfig(env, { manifestFileName: 'prod.manifest.json' }),
    // Only this compiler splits chunks, so the record is kept here rather than in commonConfig
    // where the service worker would overwrite it.
    plugins: [
      ...commonConfig(env, { manifestFileName: 'prod.manifest.json' }).plugins,
      new RecordChunkModulesPlugin({ fileName: 'chunk-modules.json' }),
    ],
    optimization: {
      ...commonOptimization(env),
      splitChunks,
    },
  },
  {
    entry: {
      'elvenassist-service-worker': './src/service-worker/svc.ts',
    },
    ...commonConfig(env, { manifestFileName: 'prod.manifest.service-worker.json' }),
    optimization: {
      ...commonOptimization(env),
    },
  },
];
