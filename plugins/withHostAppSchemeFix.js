const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");
const plist = require("@expo/plist");

const withHostAppSchemeFix = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const iosPath = config.modRequest.platformProjectRoot;
      const targetName = config.name + "ShareExtension";
      const infoPlistPath = path.join(iosPath, targetName, "Info.plist");

      console.log("[HostAppSchemeFix] Checking Info.plist at:", infoPlistPath);
      if (fs.existsSync(infoPlistPath)) {
        try {
          const content = fs.readFileSync(infoPlistPath, "utf8");
          const parsed = plist.parse(content);
          
          if (Array.isArray(parsed.HostAppScheme)) {
            console.log("[HostAppSchemeFix] Fixing HostAppScheme from array to string:", parsed.HostAppScheme);
            parsed.HostAppScheme = parsed.HostAppScheme[0];
            fs.writeFileSync(infoPlistPath, plist.build(parsed), "utf8");
          } else {
            console.log("[HostAppSchemeFix] HostAppScheme is already a string or not present:", parsed.HostAppScheme);
          }
        } catch (err) {
          console.warn("[HostAppSchemeFix] Failed to fix HostAppScheme Info.plist:", err);
        }
      } else {
        console.log("[HostAppSchemeFix] Info.plist not found, skipping.");
      }
      return config;
    },
  ]);
};

module.exports = withHostAppSchemeFix;
