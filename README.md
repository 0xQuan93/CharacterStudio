# Character Studio Workbench by 0xQuan

A local browser editor for VRM avatars and animated GLB characters. Choose a bundled starter or import a model, edit it, save a portable project, and export the result. The workbench is built on the [M3-org CharacterStudio](https://github.com/M3-org/CharacterStudio) project; its original modular editor is still available at `/` when its separate upstream asset pack is installed. This fork retains the upstream MIT license and credits.

## Run locally

Use Node.js 20.19+ or 22.12+ (Vite 7's supported range). From the repository root:

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci --no-fund --no-audit
npm run test:workbench
npm run build
npm run serve -- --host 127.0.0.1 --port 18991 --strictPort
```

Open <http://127.0.0.1:18991/workbench.html>. Use `npm run dev` during development; Vite serves the same route. No account or API key is needed for the workbench. The classic upstream editor at `/` uses a separate [loot-assets](https://github.com/m3-org/loot-assets) checkout; run `npm run get-assets` only if you want that editor and have reviewed that pack's terms.

## What you can make

- Edit the bundled historical CC0 VRM human studies with semantic skin, eye, brow, and hair colors; bounded face targets; sculpting; texture painting; section tints; and seeded variations.
- Edit the CC0 Robot, Bat, and Slime GLB starters, or import a local VRM/GLB. Preview source animations and hide parts where supported.
- Save a portable `.avatar.json` project with its source bytes and edit recipe. Reopen it to keep editing. Export the current model as VRM when it has a supported humanoid VRM rig, or GLB for generic models.
- Undo or redo edits in the current session. The latest project also autosaves in this browser; download a project file to keep separate versions or move machines.

The workbench edits existing geometry and materials. It does not create a humanoid rig from a static image, refit clothes, add topology, or guarantee every imported model will export. Strong sculpt edits can affect facial expressions and skinning; inspect motion and reimport an export before using it elsewhere. The original upstream editor, PoseLab, and WearHaus are separate tools and are not required for this workbench.

See [workbench guide](docs/workbench/README.md), [starter asset provenance](docs/workbench/ASSETS.md), and [face study details](docs/workbench/FACE-CONTROLS.md). Starter models are CC0 with their own provenance and receipts; the MIT code license does not grant rights to a model that you import.

## Development and attribution

`npm run test:workbench` covers project bounds, source-preserving export, color conversion, shape edits, sculpting, painting, and seeded generation. `npm run build` builds both the upstream and workbench entry points. The workbench source is under `src/workbench/`, with public starter assets under `public/workbench-assets/`.

CharacterStudio began at [Webaverse](https://github.com/webaverse/characterstudio) and is maintained by [M3-org](https://github.com/M3-org/CharacterStudio). The 0xQuan workbench adds the local editor and curated starter library. See [LICENSE](LICENSE) for code terms and [ASSETS.md](docs/workbench/ASSETS.md) for model terms. The bundled MPFB face foundation is source data for future work; it is not served as an editable starter.
