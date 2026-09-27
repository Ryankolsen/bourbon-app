# Patches

Applied by `patch-package` on `postinstall`. Regenerate a patch with
`npx patch-package <pkg> --exclude '(package\.json$|/build/)'` so Gradle and
Xcode build output under `node_modules` is never captured.

## react-native-view-shot 4.0.3

**Fixes:** Android `captureRef` failing under the New Architecture (Fabric).
`UIBlockViewResolver.resolveView` must run on the UI thread, but view-shot
called it from a background thread. The patch resolves the view on the UI
thread and waits up to 5 seconds for it.

**Used by:** achievement and belt share cards (`hooks/use-share-achievement.ts`).

**Remove when:** an upgraded view-shot resolves Fabric views on the UI thread
itself. Check this when upgrading to view-shot 5 (Phase 8 of the dependency
upgrade plan).
