const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// react-native's own react_native_post_install() is supposed to bump every pod's
// IPHONEOS_DEPLOYMENT_TARGET up to its own minimum (15.1 for RN 0.81), but in
// practice that hasn't been firing here, so several third-party pods (react-native-maps,
// AsyncStorage, RNSVG, SDWebImage) keep their own much older declared targets — which
// current Xcode refuses to build at all. This inserts an explicit, unconditional
// override right after the react_native_post_install(...) call, inside the same
// post_install block, so it survives every `expo prebuild --clean` regeneration.
const MARKER = '# --- withIosPodDeploymentTargetFix ---';

function withIosPodDeploymentTargetFix(config, { minVersion = '15.1' } = {}) {
    return withDangerousMod(config, [
        'ios',
        (config) => {
            const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
            let contents = fs.readFileSync(podfilePath, 'utf8');

            if (contents.includes(MARKER)) {
                return config;
            }

            const callToken = 'react_native_post_install(';
            const callIndex = contents.indexOf(callToken);
            if (callIndex === -1) {
                console.warn('[withIosPodDeploymentTargetFix] react_native_post_install(...) call not found in Podfile — skipping.');
                return config;
            }

            // Find the matching closing paren for the call by depth counting,
            // since the call spans multiple lines/arguments.
            let depth = 1;
            let i = callIndex + callToken.length;
            for (; i < contents.length && depth > 0; i++) {
                if (contents[i] === '(') depth++;
                else if (contents[i] === ')') depth--;
            }

            const insertion =
                `\n\n  ${MARKER}\n` +
                `  installer.pods_project.targets.each do |target|\n` +
                `    target.build_configurations.each do |build_config|\n` +
                `      current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']\n` +
                `      if current.nil? || current.to_f < ${minVersion}\n` +
                `        build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${minVersion}'\n` +
                `      end\n` +
                `    end\n` +
                `  end\n`;

            contents = contents.slice(0, i) + insertion + contents.slice(i);
            fs.writeFileSync(podfilePath, contents);
            return config;
        },
    ]);
}

module.exports = withIosPodDeploymentTargetFix;
