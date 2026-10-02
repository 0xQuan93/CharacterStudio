import { generateVariation } from "./generator.js"
import { TexturePainter } from "./TexturePainter.jsx"
import { ColorControl } from "./ColorControl.jsx"
import React, { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { Viewport } from "./viewport.js"
import {
  validateTextures,
  validateProject,
  createHistory,
  commitHistory,
  undoHistory,
  redoHistory,
  createSpiritVariant,
} from "./project.js"
import { parseGlb, patchGlb } from "./glb.js"
import {
  readAutosave,
  writeAutosave,
  download,
  encodeBytes,
  decodeBytes,
  filename,
} from "./storage.js"
import {
  describeAppearance,
  EMPTY_APPEARANCE,
  colorGroup,
  setHairVisibility,
} from "./appearance.js"
import "./workbench.css"

const initial = {
  schema: "character-studio/project",
  version: 1,
  name: "Signal companion",
  assetId: "signal-spirit",
  kind: "spirit",
  parameters: {
    bodyWidth: 1,
    bodyHeight: 1,
    bodyDepth: 0.55,
    earHeight: 0.28,
    eyeSize: 0.13,
    footSize: 0.19,
    fragment: true,
    bodyColor: "#9badab",
    accentColor: "#b9ddc9",
  },
  colors: {},
  morphs: {},
  textures: {},
  scale: [1, 1, 1],
  hiddenMeshes: [],
}
const emptyInfo = {
  materials: [],
  meshes: [],
  morphs: [],
  animations: [],
  isVRM: false,
  triangles: 0,
  bones: 0,
}
const categories = ["All", "Human", "Creature", "Robot", "Companion"]
const seedAssets = [
  {
    id: "signal-spirit",
    name: "Signal spirit",
    category: "Companion",
    description:
      "An original, editable companion. Two ears. Small feet. One memory.",
    author: "0xQuan + Codex",
    license: "Original",
    source: "",
    licenseUrl: "",
    glyph: "✦",
    thumbnail: "/workbench-assets/thumbnails/spirit.webp",
  },
]
const glyphs = { Human: "◉", Creature: "♧", Robot: "▣", Companion: "✦" }
function Range({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onPreview,
  onCommit,
}) {
  return (
    <label className="range">
      <span>
        {label}
        <output>{Number(value).toFixed(2)}</output>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onPreview(+e.target.value)}
        onPointerUp={(e) => onCommit(+e.currentTarget.value)}
        onKeyUp={(e) => onCommit(+e.currentTarget.value)}
        onBlur={(e) => onCommit(+e.currentTarget.value)}
      />
    </label>
  )
}
function App() {
  const canvas = useRef(),
    view = useRef(),
    source = useRef(),
    importRef = useRef(),
    projectRef = useRef(),
    textureRef = useRef(),
    textureTarget = useRef()
  const [history, setHistory] = useState(() => createHistory(initial)),
    [draft, setDraft] = useState(null),
    [catalog, setCatalog] = useState(seedAssets),
    [info, setInfo] = useState(emptyInfo),
    [appearance, setAppearance] = useState(EMPTY_APPEARANCE),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("Opening your workbench…"),
    [error, setError] = useState(""),
    [tab, setTab] = useState("Shape"),
    [filter, setFilter] = useState("All"),
    [search, setSearch] = useState(""),
    [saved, setSaved] = useState("Local project"),
    [playing, setPlaying] = useState(false),
    [clip, setClip] = useState(""),
    [seed, setSeed] = useState("quiet-frequency"),
    [morphSearch, setMorphSearch] = useState(""),
    [light, setLight] = useState("studio"),
    [nameDraft, setNameDraft] = useState(initial.name),
    [loaded, setLoaded] = useState(false),
    [expression, setExpression] = useState(""),
    [accentPicking, setAccentPicking] = useState(false),
    [accentTarget, setAccentTarget] = useState(null),
    [paintTarget, setPaintTarget] = useState(null),
    [sculptActive, setSculptActive] = useState(false),
    [sculptMesh, setSculptMesh] = useState(0),
    [brush, setBrush] = useState({
      mode: "inflate",
      radius: 0.04,
      strength: 0.15,
      symmetry: true,
    })
  const project = draft || history.current,
    asset = catalog.find((a) => a.id === project.assetId),
    isSpirit = project.kind === "spirit"
  const change = (patch, preview = false) => {
    if (busy) return
    try {
      const next = validateProject({ ...history.current, ...patch })
      if (preview) setDraft(next)
      else {
        setHistory((h) => commitHistory(h, next))
        setDraft(null)
      }
    } catch (e) {
      setError(e.message)
    }
  }
  useEffect(() => setNameDraft(history.current.name), [history.current.name])
  const parameters = (key, value, preview) =>
    change({ parameters: { ...project.parameters, [key]: value } }, preview)
  useEffect(() => {
    const viewport = new Viewport(canvas.current)
    view.current = viewport
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch("/workbench-assets/catalog.json")
        if (!r.ok) throw new Error("Asset catalog is unavailable")
        const assets = await r.json()
        if (!Array.isArray(assets)) throw new Error("Invalid asset catalog")
        if (!cancelled) setCatalog([...seedAssets, ...assets])
      } catch (e) {
        if (!cancelled) setError(e.message)
      }
      try {
        const saved = await readAutosave()
        if (saved && !cancelled)
          setHistory(createHistory(validateProject(saved)))
      } catch (e) {
        if (!cancelled)
          setError(`Could not restore the last project: ${e.message}`)
      }
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
      viewport.dispose()
    }
  }, [])
  useEffect(() => {
    if (!ready) return
    let cancelled = false
    setBusy(true)
    setLoaded(false)
    source.current = null
    setInfo(emptyInfo)
    setAppearance(EMPTY_APPEARANCE)
    setError("")
    setPlaying(false)
    setClip("")
    setExpression("")
    ;(async () => {
      try {
        let nextInfo
        if (project.kind === "spirit") {
          source.current = null
          nextInfo = view.current.spirit(project)
        } else {
          let bytes
          if (project.source) bytes = decodeBytes(project.source.data)
          else {
            const entry = catalog.find((a) => a.id === project.assetId)
            if (!entry?.url?.startsWith("/workbench-assets/"))
              throw new Error(
                "This project needs an installed asset or an embedded source file.",
              )
            const response = await fetch(entry.url)
            if (!response.ok) throw new Error(`Could not load ${entry.name}`)
            bytes = await response.arrayBuffer()
            if (entry.sha256) {
              const hash = [
                ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
              ]
                .map((v) => v.toString(16).padStart(2, "0"))
                .join("")
              if (hash !== entry.sha256)
                throw new Error("Asset checksum does not match its catalog.")
            }
          }
          if (bytes.byteLength > 50 * 1024 * 1024)
            throw new Error("Choose a model smaller than 50 MB.")
          const glb = parseGlb(bytes)
          if (
            (glb.json.buffers || []).some((b) => b.uri) ||
            (glb.json.images || []).some(
              (i) => i.uri && !i.uri.startsWith("data:"),
            )
          )
            throw new Error(
              "Import a self-contained GLB or VRM with embedded textures.",
            )
          if (cancelled) return
          source.current = bytes
          nextInfo = await view.current.load(bytes, project)
          if (!cancelled) setAppearance(describeAppearance(glb.json))
          if (
            nextInfo &&
            Object.keys(project.textures || {}).some(
              (i) =>
                !nextInfo.materials.find((m) => m.index === Number(i))
                  ?.canTexture,
            )
          )
            throw new Error(
              "A painted surface in this project has no compatible UV coordinates.",
            )
        }
        if (!cancelled) {
          setLoaded(true)
          setInfo(nextInfo)
          setStatus(
            project.kind === "spirit"
              ? "Companion ready to shape."
              : "Model ready. Make it yours.",
          )
        }
      } catch (e) {
        if (!cancelled) {
          source.current = null
          view.current.clear()
          setError(e.message)
          setStatus("Model could not be opened.")
        }
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ready, project.assetId, project.kind, project.source?.data, catalog])
  useEffect(() => {
    if (!ready || busy) return
    if (isSpirit) {
      const camera = view.current.camera.position.clone(),
        target = view.current.controls.target.clone()
      view.current.spirit(project)
      view.current.camera.position.copy(camera)
      view.current.controls.target.copy(target)
    } else view.current.update(project)
  }, [project, busy, ready])
  useEffect(() => {
    if (!ready || draft) return
    setSaved("Saving locally…")
    const t = setTimeout(
      () =>
        writeAutosave(history.current)
          .then(() => setSaved("Saved on this device"))
          .catch((e) => {
            setSaved("Autosave unavailable")
            setError(`Download your project to keep it: ${e.message}`)
          }),
      650,
    )
    return () => clearTimeout(t)
  }, [history.current, ready, draft])
  function undo() {
    if (busy) return
    setDraft(null)
    setHistory((h) => undoHistory(h))
  }
  function redo() {
    if (busy) return
    setDraft(null)
    setHistory((h) => redoHistory(h))
  }
  useEffect(() => {
    if (!view.current) return
    view.current.onSculptCommit = (edits) => {
      change({ sculpt: edits })
      setStatus("Sculpt stroke applied. Undo restores the previous shape.")
    }
    view.current.onSculptError = (e) => setError(e.message)
  })
  useEffect(() => {
    if (!view.current) return
    view.current.setSculptSettings({
      ...brush,
      meshIndex: sculptMesh,
      enabled:
        tab === "Sculpt" && sculptActive && info.isVRM && loaded && !busy,
    })
  }, [tab, sculptActive, sculptMesh, brush, info.isVRM, loaded, busy])
  useEffect(() => {
    if (!view.current) return
    view.current.accentPicking = accentPicking && tab === "Appearance" && !busy
    view.current.onAccentPick = (target) => {
      setAccentTarget(target)
      setAccentPicking(false)
      setStatus(
        "Hair section selected. Its color can now be edited independently.",
      )
    }
  }, [accentPicking, tab, busy])
  useEffect(() => {
    setAccentTarget(null)
    setAccentPicking(false)
  }, [project.assetId, project.source?.data])
  useEffect(() => {
    setSculptMesh(info.meshes.find((m) => m.sculptable)?.index ?? 0)
    setSculptActive(false)
  }, [info])
  function paintMaterial(index) {
    try {
      setPaintTarget({
        index,
        label: info.materials.find((m) => m.index === index)?.name || "Surface",
        source: view.current.textureImage(index),
        shadeRatio: view.current.textureShadeRatio(index),
      })
    } catch (e) {
      setError(e.message)
    }
  }
  async function saveProject() {
    if (busy || !loaded) return
    try {
      let p = {
        ...history.current,
        name: nameDraft.trim() || history.current.name,
      }
      if (source.current)
        p = {
          ...p,
          source: {
            name: filename(p.name) + (info.isVRM ? ".vrm" : ".glb"),
            data: encodeBytes(source.current),
          },
          provenance:
            p.provenance ||
            (asset
              ? {
                  author: asset.author,
                  license: asset.license,
                  source: asset.source,
                  licenseUrl: asset.licenseUrl,
                }
              : undefined),
        }
      download(
        JSON.stringify(validateProject(p)),
        filename(p.name) + ".avatar.json",
        "application/json",
      )
      setStatus("Portable project saved, including its source model.")
    } catch (e) {
      setError(e.message)
    }
  }
  useEffect(() => {
    const handler = (e) => {
      if (document.querySelector("dialog[open]")) return
      if (e.target.closest("input,textarea,select")) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        saveProject()
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault()
        e.shiftKey ? redo() : undo()
      }
      if (e.key.toLowerCase() === "f") view.current.fit()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  })
  async function selectAsset(a) {
    if (busy) return
    setDraft(null)
    setHistory((h) =>
      commitHistory(h, {
        ...initial,
        name: a.id === "signal-spirit" ? "Signal companion" : a.name,
        assetId: a.id,
        kind: a.id === "signal-spirit" ? "spirit" : "library",
        parameters: a.id === "signal-spirit" ? initial.parameters : {},
        provenance: {
          author: a.author,
          license: a.license,
          source: a.source,
          licenseUrl: a.licenseUrl,
        },
      }),
    )
    setTab(a.category === "Human" ? "Appearance" : "Shape")
  }
  async function importModel(file) {
    try {
      if (!file) return
      if (file.size > 50 * 1024 * 1024)
        throw new Error("Choose a GLB or VRM smaller than 50 MB.")
      const b = await file.arrayBuffer()
      parseGlb(b)
      setDraft(null)
      setHistory((h) =>
        commitHistory(
          h,
          validateProject({
            ...initial,
            name: file.name.replace(/\.(glb|vrm)$/i, ""),
            assetId: "imported",
            kind: "import",
            parameters: {},
            source: { name: file.name, data: encodeBytes(b) },
          }),
        ),
      )
      setTab("Appearance")
    } catch (e) {
      setError(e.message)
    } finally {
      importRef.current.value = ""
    }
  }
  async function openProject(file) {
    try {
      if (!file) return
      if (file.size > 96 * 1024 * 1024)
        throw new Error("Project exceeds the 96 MB limit.")
      const p = validateProject(JSON.parse(await file.text()))
      if (
        !p.source &&
        p.kind !== "spirit" &&
        !catalog.some((a) => a.id === p.assetId)
      )
        throw new Error(
          "The required asset is not installed. Save a portable project on the source machine.",
        )
      setDraft(null)
      setHistory((h) => commitHistory(h, p))
      setTab(p.kind === "spirit" ? "Shape" : "Appearance")
      setStatus("Project opened.")
    } catch (e) {
      setError(e.message)
    } finally {
      projectRef.current.value = ""
    }
  }
  async function importTexture(file) {
    try {
      if (!file) return
      if (file.size > 8 * 1024 * 1024)
        throw new Error("Choose a PNG or JPEG smaller than 8 MB.")
      if (!["image/png", "image/jpeg"].includes(file.type))
        throw new Error("Use a PNG or JPEG texture.")
      const data = encodeBytes(await file.arrayBuffer())
      validateTextures({
        [textureTarget.current]: { name: file.name, mimeType: file.type, data },
      })
      const bitmap = await createImageBitmap(file)
      const tooLarge = bitmap.width > 4096 || bitmap.height > 4096
      bitmap.close()
      if (tooLarge)
        throw new Error("Texture dimensions must be at most 4096 × 4096.")
      change({
        textures: {
          ...project.textures,
          [textureTarget.current]: {
            name: file.name,
            mimeType: file.type,
            data,
          },
        },
      })
      setStatus(
        "Texture applied. Save the project to retain your painted surface.",
      )
    } catch (e) {
      setError(e.message)
    } finally {
      textureRef.current.value = ""
    }
  }
  async function exportModel() {
    if (!loaded || busy) return
    setBusy(true)
    setError("")
    try {
      const data = isSpirit
        ? await view.current.exportSpirit()
        : patchGlb(source.current, history.current)
      download(
        data,
        filename(project.name) + (info.isVRM ? ".vrm" : ".glb"),
        "model/gltf-binary",
      )
      setStatus(
        info.isVRM
          ? "VRM exported. Open it in PoseLab to pose and animate."
          : "GLB exported with its available rig and animations.",
      )
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  async function screenshot() {
    download(await view.current.screenshot(), filename(project.name) + ".png")
    setStatus("Viewport image saved.")
  }
  const filtered = catalog.filter(
    (a) =>
      (filter === "All" || a.category === filter) &&
      (a.name + " " + a.description)
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  const previewScale = (i, v, preview) =>
    change({ scale: project.scale.map((x, j) => (i === j ? v : x)) }, preview)
  const provenance = project.provenance || asset
  return (
    <div className="workbench">
      <header className="topbar">
        <a className="brand" href="/workbench.html">
          <span className="brand-mark">◈</span>
          <span>
            CHARACTER STUDIO<small>0xQUAN WORKBENCH</small>
          </span>
        </a>
        <div className="project-title">
          <input
            aria-label="Project name"
            value={nameDraft}
            maxLength={100}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() =>
              change({ name: nameDraft.trim() || history.current.name })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur()
            }}
          />
          <span>{saved}</span>
        </div>
        <div className="top-actions">
          <button
            title="Undo · Ctrl+Z"
            aria-label="Undo"
            disabled={busy || !history.past.length}
            onClick={undo}
          >
            ↶
          </button>
          <button
            title="Redo · Ctrl+Shift+Z"
            aria-label="Redo"
            disabled={busy || !history.future.length}
            onClick={redo}
          >
            ↷
          </button>
          <span className="divider" />
          <button onClick={() => projectRef.current.click()} disabled={busy}>
            Open project
          </button>
          <button onClick={saveProject} disabled={busy}>
            Save project
          </button>
          <button
            className="primary"
            disabled={busy}
            onClick={() => setTab("Export")}
          >
            Export ↗
          </button>
        </div>
      </header>
      <div className="workspace-body">
        <aside className="library">
          <div className="panel-heading">
            <div>
              <small>START WITH A SHAPE</small>
              <h2>Your library</h2>
            </div>
            <button
              title="Import GLB or VRM"
              aria-label="Import model"
              onClick={() => importRef.current.click()}
              disabled={busy}
            >
              ＋
            </button>
          </div>
          <label className="search">
            <span>⌕</span>
            <input
              placeholder="Find a character…"
              aria-label="Search library"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="filters">
            {categories.map((c) => (
              <button
                key={c}
                className={filter === c ? "active" : ""}
                onClick={() => setFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="asset-list">
            {filtered.map((a) => (
              <button
                disabled={busy}
                className={`asset-card ${
                  project.assetId === a.id ? "selected" : ""
                }`}
                key={a.id}
                onClick={() => selectAsset(a)}
              >
                {a.thumbnail ? (
                  <img className="asset-art" src={a.thumbnail} alt="" />
                ) : (
                  <span className={`asset-art art-${a.category.toLowerCase()}`}>
                    {a.glyph || glyphs[a.category] || "◇"}
                  </span>
                )}
                <span className="asset-card-copy">
                  <strong>{a.name}</strong>
                  <span>
                    {a.category} <i>·</i>{" "}
                    {a.license === "CC0-1.0" ? "CC0" : a.license}
                  </span>
                </span>
                <span className="asset-arrow">↗</span>
              </button>
            ))}
          </div>
          <div className="library-note">
            <span className="small-dot" />
            <p>
              Local assets. Yours to explore.
              <br />
              <button className="text-button" onClick={() => setTab("Export")}>
                View source & permissions
              </button>
            </p>
          </div>
        </aside>
        <main className="stage">
          <div className="stage-heading">
            <div className="pill">
              <span className="small-dot" />
              {isSpirit
                ? "PARAMETRIC COMPANION"
                : info.isVRM
                ? "HUMANOID · VRM"
                : "CHARACTER · GLB"}
            </div>
            <div className="stage-controls">
              <button onClick={() => view.current.fit("front")}>Front</button>
              <button onClick={() => view.current.fit("side")}>Side</button>
              {info.isVRM && (
                <button onClick={() => view.current.fit("face")}>Face</button>
              )}
              <button
                title="Frame model · F"
                onClick={() => view.current.fit()}
              >
                Frame
              </button>
              <button
                title="Save viewport PNG"
                aria-label="Capture PNG"
                onClick={screenshot}
              >
                ▧
              </button>
            </div>
          </div>
          <div className="canvas-wrap">
            <canvas
              ref={canvas}
              aria-label="Interactive 3D character preview"
            />
            {busy && (
              <div className="loading">
                <span className="spinner" />
                Preparing your character…
              </div>
            )}
          </div>
          <div className="stage-footer">
            <span>
              Drag to orbit <i>·</i> Scroll to zoom <i>·</i> Right-drag to pan
            </span>
            <button
              onClick={() => {
                const next = light === "studio" ? "paper" : "studio"
                setLight(next)
                view.current.scene.background.set(
                  next === "paper" ? "#d5d7cd" : "#151d20",
                )
              }}
            >
              ◐ {light === "studio" ? "Studio" : "Paper"}
            </button>
          </div>
          <div className="status-line" role="status">
            <span>{status}</span>
            <span>
              {info.triangles
                ? `${info.triangles.toLocaleString()} triangles`
                : "Original geometry"}{" "}
              <i>·</i> {info.animations.length} clips
            </span>
          </div>
        </main>
        <aside className="inspector">
          <nav aria-label="Character tools">
            {[
              ...(!isSpirit ? ["Appearance"] : []),
              "Shape",
              ...(info.isVRM ? ["Sculpt"] : []),
              "Surface",
              "Parts",
              "Motion",
              "Export",
            ].map((t) => (
              <button
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </nav>
          <div className="inspector-content">
            <small className="eyebrow">
              {tab === "Sculpt"
                ? "SHAPE THE SURFACE"
                : tab === "Appearance"
                ? "SKIN, HAIR & FACE"
                : tab === "Shape"
                ? "FORM & CHARACTER"
                : tab === "Surface"
                ? "COLOR & MATERIAL"
                : tab === "Parts"
                ? "VISIBLE GEOMETRY"
                : tab === "Motion"
                ? "BRING IT TO LIFE"
                : "TAKE IT SOMEWHERE"}
            </small>
            <h1>
              {tab === "Sculpt"
                ? "Sculpt their form"
                : tab === "Appearance"
                ? "Define their look"
                : tab === "Shape"
                ? "Make it your own"
                : tab === "Surface"
                ? "Set the palette"
                : tab === "Parts"
                ? "Choose the parts"
                : tab === "Motion"
                ? "Find its movement"
                : "Ready for the world"}
            </h1>
            {error && (
              <div className="error" role="alert">
                {error}
                <button aria-label="Dismiss error" onClick={() => setError("")}>
                  ×
                </button>
              </div>
            )}
            {tab === "Sculpt" && (
              <>
                <p className="intro">
                  Reshape the existing mesh with soft, reversible strokes. Start
                  small around the face. The rig and original expression targets
                  stay attached.
                </p>
                <label className="field-label">
                  Surface to sculpt
                  <select
                    aria-label="Sculpt surface"
                    value={sculptMesh}
                    onChange={(e) => setSculptMesh(Number(e.target.value))}
                  >
                    {info.meshes
                      .filter((m) => m.sculptable)
                      .map((m) => (
                        <option key={m.index} value={m.index}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="field-label">
                  Brush
                  <select
                    aria-label="Sculpt brush"
                    value={brush.mode}
                    onChange={(e) =>
                      setBrush({ ...brush, mode: e.target.value })
                    }
                  >
                    <option value="inflate">Build outward</option>
                    <option value="deflate">Push inward</option>
                    <option value="smooth">Relax sculpt edits</option>
                  </select>
                </label>
                <Range
                  label="Brush radius (meters)"
                  min={0.008}
                  max={0.12}
                  step={0.002}
                  value={brush.radius}
                  onPreview={(v) => setBrush({ ...brush, radius: v })}
                  onCommit={(v) => setBrush({ ...brush, radius: v })}
                />
                <Range
                  label="Brush strength"
                  min={0.02}
                  max={0.5}
                  step={0.01}
                  value={brush.strength}
                  onPreview={(v) => setBrush({ ...brush, strength: v })}
                  onCommit={(v) => setBrush({ ...brush, strength: v })}
                />
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={brush.symmetry}
                    onChange={(e) =>
                      setBrush({ ...brush, symmetry: e.target.checked })
                    }
                  />
                  Mirror across the model's X axis
                </label>
                <button
                  className="primary wide"
                  disabled={!info.meshes.some((m) => m.sculptable)}
                  onClick={() => setSculptActive(!sculptActive)}
                >
                  {sculptActive ? "Stop sculpting / orbit" : "Start sculpting"}
                </button>
                <button
                  className="wide"
                  onClick={() => {
                    change({ sculpt: {} })
                    setStatus("Sculpt edits reset; original geometry restored.")
                  }}
                >
                  Reset sculpt edits
                </button>
                <p className="hint">
                  Left-drag on the selected visible surface. Stop sculpting to
                  orbit. Each stroke is one undo step. Motion pauses while
                  sculpting. Edits are limited to 12 cm from source vertices.
                </p>
                <p className="hint">
                  Local shape editing does not refit clothes, move joints, add
                  topology, or guarantee every facial expression still deforms
                  well. Check the face and body in Motion after sculpting.
                </p>
              </>
            )}
            {tab === "Appearance" && (
              <>
                <p className="intro">
                  Bring the face, skin, and hair together. Each control follows
                  the parts available in this model.
                </p>
                {appearance.groups.length > 0 && (
                  <div className="callout">
                    <h3>Night mint palette</h3>
                    <p>
                      Warm skin, dark hair, and a mint eye tint. Adjust these
                      sample colors for your own character.
                    </p>
                    <button
                      className="wide"
                      disabled={busy}
                      onClick={() => {
                        const palette = {
                          skin: "#c89470",
                          hair: "#191716",
                          brows: "#191716",
                          eyes: "#a6c6bd",
                        }
                        let colors = { ...project.colors }
                        for (const group of appearance.groups)
                          colors = colorGroup(
                            colors,
                            group.indices,
                            palette[group.id],
                          )
                        change({ colors })
                      }}
                    >
                      Apply night mint palette
                    </button>
                  </div>
                )}
                {appearance.hairMeshes.length > 0 && (
                  <div className="section">
                    <h3>Hair accents</h3>
                    <p className="hint">
                      Select an existing hair section to give it a separate
                      tint, even when strands share a texture. The base texture
                      still affects its color.
                    </p>
                    <button
                      className="wide"
                      disabled={busy}
                      onClick={() => setAccentPicking(!accentPicking)}
                    >
                      {accentPicking
                        ? "Cancel hair selection"
                        : "Select hair section on model"}
                    </button>
                    {accentPicking && (
                      <p className="hint">
                        Click the hair section you want to accent.
                      </p>
                    )}
                    {accentTarget && (
                      <div className="color-row">
                        <span>Section {accentTarget.key}</span>
                        <ColorControl
                          aria-label="Hair section color"
                          value={
                            project.primitiveColors?.[accentTarget.key] ||
                            project.colors[accentTarget.material] ||
                            info.materials.find(
                              (m) => m.index === accentTarget.material,
                            )?.color ||
                            "#ffffff"
                          }
                          onChange={(e) =>
                            change({
                              primitiveColors: {
                                ...project.primitiveColors,
                                [accentTarget.key]: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    )}
                    {accentTarget && (
                      <button
                        className="text-button"
                        onClick={() => {
                          const colors = { ...project.primitiveColors }
                          delete colors[accentTarget.key]
                          change({ primitiveColors: colors })
                        }}
                      >
                        Reset selected section
                      </button>
                    )}
                    {Object.keys(project.primitiveColors || {}).length > 0 && (
                      <button
                        className="text-button"
                        onClick={() => change({ primitiveColors: {} })}
                      >
                        Reset all hair accents
                      </button>
                    )}
                  </div>
                )}
                <details className="section">
                  <summary>Generate a variation</summary>
                  <p className="hint">
                    Reproducible palettes and supported identity shapes. Sculpt
                    strokes and painted textures stay in your project; colors
                    tint those textures.
                  </p>
                  <label className="field-label">
                    Variation seed
                    <input
                      aria-label="Avatar variation seed"
                      value={seed}
                      maxLength={100}
                      onChange={(e) => setSeed(e.target.value)}
                    />
                  </label>
                  <button
                    className="wide"
                    disabled={busy || !appearance.groups.length}
                    onClick={() => {
                      change(generateVariation(project, appearance, seed))
                      setStatus(
                        "Seeded variation applied. Undo restores your previous character.",
                      )
                    }}
                  >
                    Generate avatar variation
                  </button>
                </details>
                {appearance.groups.map((group) => (
                  <div className="appearance-group" key={group.id}>
                    <div className="color-row">
                      <span>{group.label}</span>
                      <ColorControl
                        aria-label={group.label}
                        disabled={busy}
                        value={
                          project.colors[group.indices[0]] ||
                          info.materials.find(
                            (m) => m.index === group.indices[0],
                          )?.color ||
                          "#ffffff"
                        }
                        onChange={(e) =>
                          change({
                            colors: colorGroup(
                              project.colors,
                              group.indices,
                              e.target.value,
                            ),
                          })
                        }
                      />
                    </div>
                    {group.indices.map(
                      (index) =>
                        info.materials.find((m) => m.index === index)
                          ?.canTexture && (
                          <button
                            key={index}
                            className="text-button"
                            disabled={busy}
                            onClick={() => paintMaterial(index)}
                          >
                            Paint{" "}
                            {group.id === "skin"
                              ? info.materials
                                  .find((m) => m.index === index)
                                  ?.name.includes("Body")
                                ? "body"
                                : "face"
                              : group.id}{" "}
                            texture
                          </button>
                        ),
                    )}
                    <div
                      className="appearance-swatches"
                      aria-label={`${group.label} palette`}
                    >
                      {group.swatches.map((color) => (
                        <button
                          key={color}
                          style={{ background: color }}
                          title={color}
                          aria-label={`${group.label} ${color}`}
                          disabled={busy}
                          onClick={() =>
                            change({
                              colors: colorGroup(
                                project.colors,
                                group.indices,
                                color,
                              ),
                            })
                          }
                        />
                      ))}
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() =>
                          change({
                            colors: colorGroup(
                              project.colors,
                              group.indices,
                              null,
                            ),
                          })
                        }
                      >
                        Original
                      </button>
                    </div>
                  </div>
                ))}
                {appearance.groups.length > 0 ? (
                  <p className="hint">
                    Colors tint the original textures. Skin changes face and
                    body together; texture shading still affects the result.
                  </p>
                ) : (
                  <p className="empty">
                    This model has no recognized skin, iris, or hair materials.
                    Use Surface to choose its colors individually.
                  </p>
                )}
                {appearance.hairMeshes.length > 0 && (
                  <div className="section">
                    <h3>Hairstyle</h3>
                    <label className="field-label">
                      Hair style
                      <select
                        aria-label="Hair style"
                        disabled={busy}
                        value={
                          appearance.hairMeshes.every((i) =>
                            project.hiddenMeshes.includes(i),
                          )
                            ? "none"
                            : appearance.hairMeshes.some((i) =>
                                project.hiddenMeshes.includes(i),
                              )
                            ? "custom"
                            : "authored"
                        }
                        onChange={(e) =>
                          change({
                            hiddenMeshes: setHairVisibility(
                              project.hiddenMeshes,
                              appearance.hairMeshes,
                              e.target.value !== "none",
                            ),
                          })
                        }
                      >
                        <option value="authored">Original hairstyle</option>
                        <option value="none">No hair</option>
                        {appearance.hairMeshes.some((i) =>
                          project.hiddenMeshes.includes(i),
                        ) &&
                          !appearance.hairMeshes.every((i) =>
                            project.hiddenMeshes.includes(i),
                          ) && (
                            <option value="custom">Custom visible parts</option>
                          )}
                      </select>
                    </label>
                    <p className="hint">
                      This starter has one authored hairstyle. More fitted
                      styles need compatible hair assets.
                    </p>
                  </div>
                )}
                {appearance.identityFeatures.length > 0 && (
                  <div className="section">
                    <h3>Facial features</h3>
                    <p className="hint">
                      Subtle, local shape changes. Zero restores the starting
                      face.
                    </p>
                    {appearance.identityFeatures
                      .filter((f) => info.morphs.some((m) => m.key === f.key))
                      .map((feature) => (
                        <Range
                          key={feature.key}
                          label={feature.label}
                          min={feature.min}
                          max={feature.max}
                          value={
                            project.morphs[feature.key] ??
                            info.morphs.find((m) => m.key === feature.key)
                              ?.initial ??
                            0
                          }
                          onPreview={(v) =>
                            change(
                              {
                                morphs: { ...project.morphs, [feature.key]: v },
                              },
                              true,
                            )
                          }
                          onCommit={(v) =>
                            change({
                              morphs: { ...project.morphs, [feature.key]: v },
                            })
                          }
                        />
                      ))}
                    <button
                      className="text-button"
                      onClick={() => {
                        const morphs = { ...project.morphs }
                        appearance.identityFeatures.forEach(
                          (f) => delete morphs[f.key],
                        )
                        change({ morphs })
                      }}
                    >
                      Reset facial features
                    </button>
                  </div>
                )}
                <details className="section face-details">
                  <summary>Resting expression details</summary>
                  <p className="hint">
                    Authored brow, eye, and mouth expressions can adjust the
                    resting face. These are expression shapes, not anatomical
                    nose or jaw controls.
                  </p>
                  {appearance.faceFeatures
                    .filter((f) => info.morphs.some((m) => m.key === f.key))
                    .map((feature) => {
                      const morph = info.morphs.find(
                        (m) => m.key === feature.key,
                      )
                      return (
                        <Range
                          key={feature.key}
                          label={feature.label}
                          value={project.morphs[feature.key] ?? morph.initial}
                          onPreview={(v) =>
                            change(
                              {
                                morphs: { ...project.morphs, [feature.key]: v },
                              },
                              true,
                            )
                          }
                          onCommit={(v) =>
                            change({
                              morphs: { ...project.morphs, [feature.key]: v },
                            })
                          }
                        />
                      )
                    })}
                  {!appearance.faceFeatures.length && (
                    <p className="empty">
                      No named, independently editable face shapes were found.
                      Shape contains the model’s other authored keys.
                    </p>
                  )}
                  {appearance.faceFeatures.length > 0 && (
                    <button
                      className="text-button"
                      onClick={() => {
                        const morphs = { ...project.morphs }
                        appearance.faceFeatures.forEach(
                          (f) => delete morphs[f.key],
                        )
                        change({ morphs })
                      }}
                    >
                      Reset face details
                    </button>
                  )}
                </details>
              </>
            )}
            {tab === "Shape" && (
              <>
                <p className="intro">
                  {isSpirit
                    ? "A small spirit with a shape of its own. Keep the familiar silhouette, or explore a new companion."
                    : "Adjust the whole silhouette and the shape keys authored into this model."}
                </p>
                {isSpirit ? (
                  <>
                    <h3>Silhouette</h3>
                    {[
                      ["bodyWidth", "Body width", 0.55, 1.6],
                      ["bodyHeight", "Body height", 0.55, 1.6],
                      ["bodyDepth", "Body depth", 0.25, 1],
                      ["earHeight", "Ear height", 0.1, 0.65],
                      ["eyeSize", "Eye size", 0.07, 0.22],
                      ["footSize", "Foot size", 0.1, 0.3],
                    ].map(([key, label, min, max]) => (
                      <Range
                        key={key}
                        label={label}
                        min={min}
                        max={max}
                        value={project.parameters[key]}
                        onPreview={(v) => parameters(key, v, true)}
                        onCommit={(v) => parameters(key, v, false)}
                      />
                    ))}
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={project.parameters.fragment !== false}
                        onChange={(e) =>
                          parameters("fragment", e.target.checked, false)
                        }
                      />
                      Carry one memory fragment
                    </label>
                    <div className="section">
                      <h3>Explore a variation</h3>
                      <label className="field-label">
                        Variation seed
                        <input
                          value={seed}
                          onChange={(e) => setSeed(e.target.value)}
                          maxLength={128}
                        />
                      </label>
                      <button
                        className="wide"
                        disabled={busy}
                        onClick={() => {
                          const variant = createSpiritVariant(seed)
                          change({ parameters: variant.parameters || variant })
                        }}
                      >
                        Generate variation ↻
                      </button>
                      <button
                        className="text-button"
                        onClick={() =>
                          change({
                            parameters: initial.parameters,
                            scale: [1, 1, 1],
                          })
                        }
                      >
                        Restore Zephyr study proportions
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3>Overall proportions</h3>
                    {["Width", "Height", "Depth"].map((label, i) => (
                      <Range
                        key={label}
                        label={label}
                        min={0.5}
                        max={1.8}
                        value={project.scale[i]}
                        onPreview={(v) => previewScale(i, v, true)}
                        onCommit={(v) => previewScale(i, v, false)}
                      />
                    ))}
                    <p className="hint">
                      Whole-model scaling keeps the rig together. Detailed body
                      shaping needs authored shape keys.
                    </p>
                    <h3>
                      Shape keys{" "}
                      <span className="count">{info.morphs.length}</span>
                    </h3>
                    {info.morphs.length ? (
                      <>
                        <input
                          className="full-input"
                          placeholder="Find a shape key…"
                          aria-label="Search shape keys"
                          value={morphSearch}
                          onChange={(e) => setMorphSearch(e.target.value)}
                        />
                        {info.morphs
                          .filter((m) =>
                            (appearance.names[m.key] || m.name)
                              .toLowerCase()
                              .includes(morphSearch.toLowerCase()),
                          )
                          .slice(0, 60)
                          .map((m) => (
                            <Range
                              key={m.key}
                              label={appearance.names[m.key] || m.name}
                              min={
                                appearance.identityFeatures.find(
                                  (f) => f.key === m.key,
                                )?.min ?? 0
                              }
                              value={project.morphs[m.key] ?? m.initial}
                              onPreview={(v) =>
                                change(
                                  { morphs: { ...project.morphs, [m.key]: v } },
                                  true,
                                )
                              }
                              onCommit={(v) =>
                                change({
                                  morphs: { ...project.morphs, [m.key]: v },
                                })
                              }
                            />
                          ))}
                      </>
                    ) : (
                      <p className="empty">
                        This model has no authored shape keys. Its materials,
                        parts, proportions, and available animations can still
                        be edited.
                      </p>
                    )}
                  </>
                )}
              </>
            )}
            {tab === "Surface" && (
              <>
                <p className="intro">
                  Choose a material tint. The original textures stay attached to
                  the model.
                </p>
                {isSpirit ? (
                  <>
                    <div className="color-row">
                      <span>Body</span>
                      <ColorControl
                        aria-label="Spirit body color"
                        value={project.parameters.bodyColor}
                        onChange={(e) =>
                          parameters("bodyColor", e.target.value, false)
                        }
                      />
                    </div>
                    <div className="color-row">
                      <span>Memory fragment</span>
                      <ColorControl
                        aria-label="Fragment color"
                        value={project.parameters.accentColor}
                        onChange={(e) =>
                          parameters("accentColor", e.target.value, false)
                        }
                      />
                    </div>
                  </>
                ) : (
                  info.materials.map((m) => (
                    <div className="material-block" key={m.index}>
                      <div className="color-row">
                        <span>{m.name}</span>
                        <ColorControl
                          aria-label={`Color ${m.name}`}
                          value={project.colors[m.index] || m.color}
                          onChange={(e) =>
                            change({
                              colors: {
                                ...project.colors,
                                [m.index]: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="texture-row">
                        <button
                          disabled={busy || !m.canTexture}
                          onClick={() => paintMaterial(m.index)}
                        >
                          Paint texture
                        </button>
                        <button
                          disabled={busy || !m.canTexture}
                          title={
                            m.canTexture
                              ? "Import a painted PNG or JPEG"
                              : "This surface needs UV coordinates before texture painting"
                          }
                          onClick={() => {
                            textureTarget.current = m.index
                            textureRef.current.click()
                          }}
                        >
                          {project.textures?.[m.index]
                            ? "Replace texture"
                            : "Import texture"}
                        </button>
                        {project.textures?.[m.index] && (
                          <button
                            title="Restore original texture and material tone"
                            onClick={() => {
                              const textures = { ...project.textures },
                                colors = { ...project.colors },
                                paintShadeRatios = {
                                  ...project.paintShadeRatios,
                                }
                              delete textures[m.index]
                              delete colors[m.index]
                              delete paintShadeRatios[m.index]
                              change({ textures, colors, paintShadeRatios })
                            }}
                          >
                            Restore source surface
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div className="section">
                  <h3>Quiet Frequency palette</h3>
                  <div className="swatches">
                    {[
                      "#101315",
                      "#eee1c9",
                      "#94633f",
                      "#b9ddc9",
                      "#59696d",
                    ].map((c) => (
                      <button
                        key={c}
                        style={{ background: c }}
                        title={c}
                        aria-label={`Use ${c} on ${
                          isSpirit ? "spirit body" : "first material"
                        }`}
                        onClick={() =>
                          isSpirit
                            ? parameters("bodyColor", c, false)
                            : info.materials[0] &&
                              change({
                                colors: {
                                  ...project.colors,
                                  [info.materials[0].index]: c,
                                },
                              })
                        }
                      />
                    ))}
                  </div>
                  <button
                    className="text-button"
                    onClick={() =>
                      isSpirit
                        ? change({
                            parameters: {
                              ...project.parameters,
                              bodyColor: initial.parameters.bodyColor,
                              accentColor: initial.parameters.accentColor,
                            },
                          })
                        : change({ colors: {} })
                    }
                  >
                    Reset material tints
                  </button>
                </div>
                <div className="callout">
                  <h3>Paint with layers</h3>
                  <p>
                    Paint layers in WearHaus 3D, export a PNG, then import it
                    onto the matching material here. Keep the same UV layout and
                    your original VRM.
                  </p>
                  <a
                    className="button wide"
                    href="http://127.0.0.1:18993/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open garment workshop ↗
                  </a>
                </div>
              </>
            )}
            {tab === "Parts" && (
              <>
                <p className="intro">
                  Show or hide meshes already in this model. Hidden parts stay
                  in your project and are omitted from the exported scene.
                </p>
                {isSpirit ? (
                  <p className="empty">
                    The spirit is generated as one design. Use Shape to adjust
                    its ears, feet, body, and memory fragment.
                  </p>
                ) : (
                  info.meshes.map((m) => (
                    <label className="toggle part" key={m.index}>
                      <input
                        type="checkbox"
                        checked={!project.hiddenMeshes.includes(m.index)}
                        onChange={(e) =>
                          change({
                            hiddenMeshes: e.target.checked
                              ? project.hiddenMeshes.filter(
                                  (i) => i !== m.index,
                                )
                              : [...project.hiddenMeshes, m.index],
                          })
                        }
                      />
                      <span>{m.name}</span>
                    </label>
                  ))
                )}
                {!isSpirit && (
                  <button
                    className="text-button"
                    onClick={() => change({ hiddenMeshes: [] })}
                  >
                    Show all parts
                  </button>
                )}
                <div className="callout">
                  <h3>Build from modular VRM parts</h3>
                  <p>
                    The classic studio assembles compatible rigged clothing and
                    accessories. Separate packs need matching rigs and fitting
                    data.
                  </p>
                  <a
                    className="button wide"
                    href="/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open modular editor ↗
                  </a>
                </div>
              </>
            )}
            {tab === "Motion" && (
              <>
                <p className="intro">
                  Preview the animation clips that came with your character.
                  Motion is a preview; exports retain the original clips.
                </p>
                {info.animations.length ? (
                  <>
                    <label className="field-label">
                      Animation
                      <select
                        value={clip}
                        onChange={(e) => {
                          setClip(e.target.value)
                          view.current.animate(Number(e.target.value))
                          setPlaying(true)
                        }}
                      >
                        <option value="" disabled>
                          Choose an animation
                        </option>
                        {info.animations.map((a, i) => (
                          <option key={i} value={i}>
                            {a || `Clip ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="wide primary"
                      disabled={clip === ""}
                      onClick={() => {
                        view.current.playing = !playing
                        setPlaying(!playing)
                      }}
                    >
                      {playing ? "Pause animation" : "Play animation"}
                    </button>
                  </>
                ) : (
                  <p className="empty">
                    No animation clips are bundled with this model.{" "}
                    {info.isVRM
                      ? "Export its VRM and use PoseLab for posing and motion."
                      : "Export GLB for your Three.js, Godot, or Blender scene."}
                  </p>
                )}
                {info.expressions?.length > 0 && (
                  <div className="section">
                    <h3>Expression preview</h3>
                    <label className="field-label">
                      Face
                      <select
                        value={expression}
                        onChange={(e) => {
                          setExpression(e.target.value)
                          view.current.expression(e.target.value)
                        }}
                      >
                        <option value="">Neutral</option>
                        {info.expressions.map((e) => (
                          <option key={e} value={e}>
                            {e}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="hint">
                      For preview and PNG captures. Your exported avatar keeps
                      its original expression system.
                    </p>
                  </div>
                )}
                <div className="callout">
                  <h3>PoseLab performance studio</h3>
                  <p>
                    Humanoid VRM files work with PoseLab’s posing tools.
                    Creatures and spirits use its GLB prop path or a general 3D
                    engine.
                  </p>
                  <a
                    className="button wide"
                    href="http://127.0.0.1:18992/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open PoseLab ↗
                  </a>
                </div>
              </>
            )}
            {tab === "Export" && (
              <>
                <p className="intro">
                  Keep the editable project, then export a character for its
                  destination.
                </p>
                <button
                  className="primary wide large"
                  disabled={busy || !loaded}
                  onClick={exportModel}
                >
                  Export {info.isVRM ? "VRM" : "GLB"} ↗
                </button>
                <button
                  className="wide"
                  disabled={busy || !loaded}
                  onClick={saveProject}
                >
                  Save portable project
                </button>
                <button
                  className="wide"
                  disabled={busy || !loaded}
                  onClick={screenshot}
                >
                  Capture viewport PNG
                </button>
                <p className="hint">
                  {info.isVRM
                    ? "VRM metadata and rig are preserved. Expressions remain available; bindings to hidden parts are omitted."
                    : "GLB keeps available geometry, materials, rig, and clips. A non-humanoid model is not converted into VRM."}
                </p>
                <div className="section provenance">
                  <small>ASSET PROVENANCE</small>
                  <h3>
                    {asset?.name || project.source?.name || "Imported model"}
                  </h3>
                  <dl>
                    <dt>Creator</dt>
                    <dd>{provenance?.author || "Not supplied"}</dd>
                    <dt>License</dt>
                    <dd>
                      {provenance?.license ||
                        "Not verified — retain the source license"}
                    </dd>
                  </dl>
                  {provenance?.source?.startsWith("https://") && (
                    <a
                      href={provenance.source}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Original source ↗
                    </a>
                  )}
                  {provenance?.licenseUrl?.startsWith("https://") && (
                    <a
                      href={provenance.licenseUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      License evidence ↗
                    </a>
                  )}
                  <p className="hint">
                    Project edits do not change the source asset’s permissions.
                  </p>
                </div>
                <div className="callout">
                  <h3>Use your export</h3>
                  <p>
                    VRM → compatible humanoid avatar runtimes
                    <br />
                    GLB → glTF tools and 3D scenes
                    <br />
                    Project → reopen here for another edit
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="inspector-bottom">
            <span>WORKBENCH 0.3</span>
            <span>LOCAL FIRST</span>
          </div>
        </aside>
      </div>
      {paintTarget && (
        <TexturePainter
          source={paintTarget.source}
          label={paintTarget.label}
          onClose={() => setPaintTarget(null)}
          onApply={(url) => {
            const entry = {
              name: "painted-" + paintTarget.label + ".png",
              mimeType: "image/png",
              data: url.split(",")[1],
            }
            const textures = { ...project.textures, [paintTarget.index]: entry }
            validateTextures(textures)
            change({
              textures,
              colors: { ...project.colors, [paintTarget.index]: "#ffffff" },
              paintShadeRatios: {
                ...project.paintShadeRatios,
                [paintTarget.index]: paintTarget.shadeRatio,
              },
            })
            setStatus("Painted texture applied. Save the project to keep it.")
          }}
        />
      )}
      <input
        hidden
        type="file"
        accept="image/png,image/jpeg"
        ref={textureRef}
        onChange={(e) => importTexture(e.target.files[0])}
      />
      <input
        hidden
        type="file"
        accept=".glb,.vrm"
        ref={importRef}
        onChange={(e) => importModel(e.target.files[0])}
      />
      <input
        hidden
        type="file"
        accept=".json,.avatar.json"
        ref={projectRef}
        onChange={(e) => openProject(e.target.files[0])}
      />
    </div>
  )
}
createRoot(document.getElementById("root")).render(<App />)
