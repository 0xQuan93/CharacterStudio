# MPFB face foundation (CC0 source data)

This is a curated source asset pack, not an installed MPFB add-on or a drop-in VRM.

Source: `makehumancommunity/mpfb2` revision `817587ceb2ea03ea17a5b47e04396cbb4ddfa2d5`.

Included: base OBJ with helpers, game-engine rig and skin weights, and 150 head/nose/chin/cheek/brow/mouth targets. The exact files, source URLs, sizes, SHA-256 digests and per-target affected-vertex counts are in `RECEIPT.json`. Files are unchanged from upstream. `LICENSE.md` explains the code/asset split; `LICENSE.ASSETS.md` is the original CC0 dedication. No MPFB application source code is included.

Targets use the original base mesh's vertex indices. Do not apply them by index to an arbitrary imported VRM. Remove modeling helpers only with a maintained vertex correspondence, and refit the skeleton/garments when changing proportions. None of this source pack is served as part of the browser's runtime catalog.

See `docs/workbench/research/humanoid-assets-2026-09.md` for the integration assessment.
