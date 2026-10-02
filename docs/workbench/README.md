# Workbench guide

Open `/workbench.html` after starting the local Vite server described in the [repository README](../../README.md). Pick a starter card or import a VRM/GLB from your device. The bundled human studies are VRM; Robot, Bat, and Slime are generic animated GLB models. A procedural Signal spirit is also included.

## Edit and save

- **Appearance** groups human skin, hair, brow, and eye colors when the model has recognizable material names. The Night mint button is a sample palette, not a likeness generator. Face targets on Human Face Study are specific to that model.
- **Shape** changes available model proportions and morph targets. **Sculpt** moves vertices on supported uncompressed triangle geometry. **Surface** edits material colors and UV textures; painting is limited to 2048-pixel images in the editor. **Parts** hides supported source meshes. **Motion** previews embedded animation and expressions.
- **Save project** downloads a portable `.avatar.json` with the imported source bytes and edits. Keep it if you want to revise an export later. The browser also autosaves its latest project locally. **Export** writes VRM for supported humanoid VRM sources and GLB for generic sources. Reopen exported files to check their appearance and motion.

Undo and redo operate on the current edit history. Save distinct project files before changing source models. Imported content stays in the local browser session and files you explicitly download; check the rights of any model or texture before sharing an exported character or project file.

## Current limits

The editor preserves much of a supported source model's rig, expressions, textures, and metadata, but it does not autorig images or arbitrary meshes, remesh, fit garments, or build a new hairstyle. Sculpting is bounded to supported geometry and can change deformation quality. Color controls may tint a source texture instead of replacing its pixels. Preview animation is not baked into a neutral export. Model-specific VRM and glTF behavior should be checked in the target runtime.

The starter library and its license evidence are in [ASSETS.md](ASSETS.md). Human Face Study's authored controls are documented in [FACE-CONTROLS.md](FACE-CONTROLS.md).
