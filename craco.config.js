module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Ignore source map warnings for the totp-generator package
      webpackConfig.ignoreWarnings = [
        {
          module: /node_modules/,
        },
      ];

      return {
        ...webpackConfig,
        optimization: {
          ...webpackConfig.optimization,
          splitChunks: {
            cacheGroups: {
              default: false,
            },
          },
          runtimeChunk: false,
        },
        output: {
          ...webpackConfig.output,
          filename: 'static/js/[name].js',
        },
      };
    },
  },
};
