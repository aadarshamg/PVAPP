const fs = require('fs');
const { withXcodeProject, withInfoPlist, IOSConfig } = require('expo/config-plugins');

const SCENE_DELEGATE_CLASS_NAME = 'SceneDelegate';
const SCENE_DELEGATE_FILE_NAME = `${SCENE_DELEGATE_CLASS_NAME}.swift`;

// Apple rejected the app (Guideline 2.1(a)) for crashing on launch. The crash log's top
// frame was the private UIKit function
// ___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption_block_invoke, trapped
// via a deliberate breakpoint instruction — the OS's own check for whether the app has
// adopted Scene-based lifecycle (UIWindowSceneDelegate + an Info.plist
// UIApplicationSceneManifest). React Native apps have never adopted this (confirmed:
// neither react-native's RCTAppDelegate nor Expo's ExpoAppDelegate implement any scene
// protocol), and the reviewer's iOS version now treats the missing adoption as a hard
// crash instead of a console warning.
//
// This is the minimal fix: AppDelegate keeps creating the window and starting React
// Native exactly as it already does (completely untouched) — this SceneDelegate's only
// job is to hand that already-built window to the UIWindowScene the OS creates, via the
// standard optional `window` property every UIApplicationDelegate (including Expo's
// generated one) already implements. No knowledge of Expo's internal AppDelegate class
// or bootstrap logic is needed, which keeps this low-risk.
const SCENE_DELEGATE_SOURCE = `import UIKit

class ${SCENE_DELEGATE_CLASS_NAME}: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        if let window = UIApplication.shared.delegate?.window {
            window.windowScene = windowScene
            self.window = window
        }
    }
}
`;

function withIosSceneDelegate(config) {
    config = withXcodeProject(config, (config) => {
        // ios/ only exists after a real iOS prebuild (on a Mac). On platforms where iOS
        // native generation never runs — this project's Windows dev machine, or an
        // Android-only EAS build that still resolves the full cross-platform config —
        // platformProjectRoot won't exist on disk yet. createBuildSourceFile does a
        // direct, unconditional fs.writeFileSync with no such guard, which crashes
        // `expo config`/`eas build` for an unrelated platform. Skip gracefully instead;
        // this has no effect on the real iOS prebuild, where the directory does exist.
        if (!fs.existsSync(config.modRequest.platformProjectRoot)) {
            return config;
        }
        const projectName = IOSConfig.XcodeUtils.getProjectName(config.modRequest.projectRoot);
        config.modResults = IOSConfig.XcodeProjectFile.createBuildSourceFile({
            project: config.modResults,
            nativeProjectRoot: config.modRequest.platformProjectRoot,
            filePath: `${projectName}/${SCENE_DELEGATE_FILE_NAME}`,
            fileContents: SCENE_DELEGATE_SOURCE,
            overwrite: true,
        });
        return config;
    });

    config = withInfoPlist(config, (config) => {
        config.modResults.UIApplicationSceneManifest = {
            UIApplicationSupportsMultipleScenes: false,
            UISceneConfigurations: {
                UIWindowSceneSessionRoleApplication: [
                    {
                        UISceneConfigurationName: 'Default Configuration',
                        UISceneDelegateClassName: `$(PRODUCT_MODULE_NAME).${SCENE_DELEGATE_CLASS_NAME}`,
                    },
                ],
            },
        };
        return config;
    });

    return config;
}

module.exports = withIosSceneDelegate;
