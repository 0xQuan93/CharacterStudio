# Local avatar workbench 0.3

[New in 0.3: sculpting, texture painting, hair accents and seeded avatars](RELEASE-0.3.md). [Earlier appearance controls and Quan reference](RELEASE-0.2.md).

Open `/workbench.html` for the broad human, creature, robot and companion editor. The original modular Character Studio remains at `/`.

```sh
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci --no-fund --no-audit
npm run test:workbench
npm run build
npm run serve -- --host 127.0.0.1 --port 18991 --strictPort
```

Visit http://127.0.0.1:18991/workbench.html. Installed starters are local. Choose a library card, edit Shape/Surface/Parts, preview Motion, then Save project and Export. Portable `.avatar.json` projects include source bytes and texture overrides. Autosave retains the latest project in this browser; download a portable file to keep distinct projects. Ctrl+S saves; Ctrl+Z/Shift+Ctrl+Z undo/redo; F frames the model outside text inputs.

The human exports VRM; generic characters and the original spirit export GLB. Existing source rigs, metadata and clips are retained. Whole-model proportions do not replace anatomical shape targets. Preview expressions and animation time are not baked into neutral exports. The original companion is a Zephyr study, not a final approved character.

The six curated model entries include exact provenance, source archives and repairs under `public/workbench-assets/`. Their catalog hashes are checked on load. The procedural spirit is original work. Third-party imports retain their own rights. Classic's separately installed Anata demo has restrictive rights and is not part of this CC0 library.

Companion links target PoseLab on port18992 and WearHaus3D on18993; start those applications separately. Exchange painted textures only on a matching UV layout. WearHaus does not preserve all VRM extensions.

The installed machine's `avatar-tools/open-character-studio.sh` imports the current Omarchy theme, starts production preview on demand and opens the app. Its stop script checks the recorded process before stopping it. Theme CSS is a local palette snapshot; it affects the workspace rather than exported materials.

- [Full specification and roadmap](PRODUCT-SPEC.md)
- [Verification and known limits](VERIFICATION.md)
- [Asset and creator research](research/assets-and-creators.md)
- [Character Studio architecture audit](research/characterstudio-architecture.md)
- [WearHaus audit](research/wearhaus-audit.md)
