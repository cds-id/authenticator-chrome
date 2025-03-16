module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
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
