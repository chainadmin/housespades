const { withProjectBuildGradle } = require("expo/config-plugins");

const GOOGLE_PLAY_BILLING_VERSION = "9.0.0";

/**
 * Keep every Android dependency on the Play-compliant Billing Library version.
 *
 * RevenueCat brings BillingClient into the app transitively, so declaring a
 * JavaScript package version alone does not guarantee which Maven artifact is
 * packaged in the AAB. Applying the resolution rule to every configuration
 * also covers future SDKs that introduce BillingClient transitively.
 */
module.exports = function withGooglePlayBilling(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== "groovy") {
      throw new Error("withGooglePlayBilling only supports Groovy build.gradle files");
    }

    const marker = "// Google Play Billing version managed by withGooglePlayBilling";
    if (config.modResults.contents.includes(marker)) {
      return config;
    }

    config.modResults.contents += `

${marker}
allprojects {
    configurations.configureEach {
        resolutionStrategy.force "com.android.billingclient:billing:${GOOGLE_PLAY_BILLING_VERSION}"
        resolutionStrategy.force "com.android.billingclient:billing-ktx:${GOOGLE_PLAY_BILLING_VERSION}"
    }
}
`;

    return config;
  });
};
