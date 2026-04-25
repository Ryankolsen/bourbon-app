const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withAdiRegistration = (config) => {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const src = path.join(__dirname, '..', 'assets', 'adi-registration.properties');
      const assetsDir = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'assets');
      const dest = path.join(assetsDir, 'adi-registration.properties');

      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }

      fs.copyFileSync(src, dest);
      return config;
    },
  ]);
};

module.exports = withAdiRegistration;
