const { withGradleProperties } = require("expo/config-plugins");

module.exports = function withAndroidSdk36(config) {
  return withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) =>
        !(
          item.type === "property" &&
          (item.key === "android.compileSdkVersion" ||
            item.key === "android.targetSdkVersion" ||
            item.key === "android.buildToolsVersion")
        )
    );

    config.modResults.push(
      {
        type: "property",
        key: "android.compileSdkVersion",
        value: "36",
      },
      {
        type: "property",
        key: "android.targetSdkVersion",
        value: "36",
      },
      {
        type: "property",
        key: "android.buildToolsVersion",
        value: "36.0.0",
      }
    );

    return config;
  });
};
