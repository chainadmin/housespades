const { withGradleProperties } = require("expo/config-plugins");

module.exports = function withAndroidSdk35(config) {
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
        value: "35",
      },
      {
        type: "property",
        key: "android.targetSdkVersion",
        value: "35",
      },
      {
        type: "property",
        key: "android.buildToolsVersion",
        value: "35.0.0",
      }
    );

    return config;
  });
};
