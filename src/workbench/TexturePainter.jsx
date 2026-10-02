import React, { useEffect, useRef, useState, useId } from "react"
import { createPortal } from "react-dom"
import { ColorControl } from "./ColorControl"
import "./texture-painter.css"

// A draft highlight layer is composited source-atop: painting never changes
// source transparency. Applying emits one texture edit for project history.
export function TexturePainter({ source, label, onApply, onClose }) {
  const dialog = useRef(null)
  const canvas = useRef(null)
  const base = useRef(null)
  const layer = useRef(null)
  const history = useRef([])
  const stroke = useRef(null)
  const callbacks = useRef({ onApply, onClose })
  callbacks.current = { onApply, onClose }
  const title = useId()
  const [color, setColor] = useState("#ecfff4")
  const [size, setSize] = useState(24)
  const [opacity, setOpacity] = useState(0.35)
  const [tool, setTool] = useState("brush")
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [steps, setSteps] = useState(0)
  const [dimensions, setDimensions] = useState("")
  const draw = () => {
    if (!base.current || !layer.current || !canvas.current) return
    const ctx = canvas.current.getContext("2d")
    ctx.clearRect(0, 0, canvas.current.width, canvas.current.height)
    ctx.globalCompositeOperation = "source-over"
    ctx.drawImage(base.current, 0, 0)
    ctx.globalCompositeOperation = "source-atop"
    ctx.drawImage(layer.current, 0, 0)
    ctx.globalCompositeOperation = "source-over"
  }
  useEffect(() => {
    dialog.current.showModal()
    return () => dialog.current?.close()
  }, [])
  useEffect(() => {
    let cancelled = false
    setReady(false)
    setError("")
    history.current = []
    setSteps(0)
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      try {
        const scale = Math.min(1, 2048 / Math.max(img.width, img.height))
        const width = Math.max(1, Math.round(img.width * scale))
        const height = Math.max(1, Math.round(img.height * scale))
        base.current = document.createElement("canvas")
        layer.current = document.createElement("canvas")
        for (const c of [base.current, layer.current, canvas.current]) {
          c.width = width
          c.height = height
        }
        base.current.getContext("2d").drawImage(img, 0, 0, width, height)
        base.current.toDataURL("image/png") // Fail early on a tainted source.
        setDimensions(
          `${width} × ${height}${
            scale < 1 ? " · resized to 2048 px maximum" : ""
          }`,
        )
        draw()
        setReady(true)
      } catch (e) {
        setError(`Cannot open this texture: ${e.message}`)
      }
    }
    img.onerror = () =>
      !cancelled && setError("Could not load the source texture.")
    img.src = source
    return () => {
      cancelled = true
    }
  }, [source])
  const point = (event) => {
    const rect = canvas.current.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) * canvas.current.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.current.height) / rect.height,
    }
  }
  const dab = (p) => {
    const ctx = layer.current.getContext("2d")
    ctx.globalCompositeOperation =
      tool === "erase" ? "destination-out" : "source-over"
    ctx.globalAlpha = opacity
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = "source-over"
  }
  const remember = () => {
    history.current.push(layer.current.toDataURL("image/png"))
    if (history.current.length > 10) history.current.shift()
    setSteps(history.current.length)
  }
  const start = (event) => {
    if (!ready || busy || event.button !== 0 || stroke.current) return
    event.preventDefault()
    remember()
    canvas.current.setPointerCapture(event.pointerId)
    stroke.current = { ...point(event), pointerId: event.pointerId }
    dab(stroke.current)
    draw()
  }
  const move = (event) => {
    if (!stroke.current || event.pointerId !== stroke.current.pointerId) return
    const next = point(event)
    const prev = stroke.current
    const distance = Math.hypot(next.x - prev.x, next.y - prev.y)
    const count = Math.max(1, Math.ceil(distance / Math.max(1, size / 4)))
    for (let i = 1; i <= count; i++) {
      dab({
        x: prev.x + ((next.x - prev.x) * i) / count,
        y: prev.y + ((next.y - prev.y) * i) / count,
      })
    }
    stroke.current = { ...next, pointerId: event.pointerId }
    draw()
  }
  const finish = (event) => {
    if (stroke.current?.pointerId !== event.pointerId) return
    stroke.current = null
    if (canvas.current.hasPointerCapture(event.pointerId))
      canvas.current.releasePointerCapture(event.pointerId)
  }
  const undo = () => {
    if (!history.current.length || busy || stroke.current) return
    setBusy(true)
    const img = new Image()
    img.onload = () => {
      if (!layer.current) return
      const ctx = layer.current.getContext("2d")
      ctx.clearRect(0, 0, layer.current.width, layer.current.height)
      ctx.drawImage(img, 0, 0)
      draw()
      setBusy(false)
    }
    img.onerror = () => {
      setBusy(false)
      setError("Could not restore that draft stroke.")
    }
    img.src = history.current.pop()
    setSteps(history.current.length)
  }
  const reset = () => {
    remember()
    layer.current
      .getContext("2d")
      .clearRect(0, 0, layer.current.width, layer.current.height)
    draw()
  }
  const apply = async () => {
    setBusy(true)
    setError("")
    try {
      // Empty or fully undone drafts must not bake a tint or replace authored
      // shader settings just because the user opened the painter.
      const highlights = layer.current
        .getContext("2d")
        .getImageData(0, 0, layer.current.width, layer.current.height).data
      const sourcePixels = base.current
        .getContext("2d")
        .getImageData(0, 0, base.current.width, base.current.height).data
      let hasHighlights = false
      for (let i = 3; i < highlights.length; i += 4) {
        if (highlights[i] && sourcePixels[i]) {
          hasHighlights = true
          break
        }
      }
      if (!hasHighlights) {
        callbacks.current.onClose()
        return
      }
      const data = canvas.current.toDataURL("image/png")
      if (data.length * 0.75 > 8 * 1024 * 1024)
        throw new Error("Painted PNG exceeds the 8 MB texture limit.")
      await callbacks.current.onApply(data)
      callbacks.current.onClose()
    } catch (e) {
      setError(e.message || "Could not apply the painted texture.")
    } finally {
      setBusy(false)
    }
  }
  return createPortal(
    <dialog
      ref={dialog}
      className="texture-painter"
      aria-labelledby={title}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) callbacks.current.onClose()
      }}
    >
      <header className="texture-painter-heading">
        <div>
          <small>TEXTURE PAINTER</small>
          <h2 id={title}>{label || "Paint highlights"}</h2>
        </div>
        <button
          onClick={() => callbacks.current.onClose()}
          disabled={busy}
          aria-label="Close texture painter"
        >
          ×
        </button>
      </header>
      <div className="texture-painter-content">
        <div className="texture-painter-toolbar">
          <label>
            Brush color
            <ColorControl
              value={color}
              aria-label="Brush color"
              onChange={(e) => setColor(e.target.value)}
              disabled={!ready || busy}
            />
          </label>
          <label>
            Tool
            <select value={tool} onChange={(e) => setTool(e.target.value)}>
              <option value="brush">Paint highlights</option>
              <option value="erase">Erase highlights</option>
            </select>
          </label>
          <label>
            Brush size · {size} px
            <input
              aria-label="Brush size"
              type="range"
              min="2"
              max="180"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
          </label>
          <label>
            Opacity · {Math.round(opacity * 100)}%
            <input
              aria-label="Brush opacity"
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
            />
          </label>
          <div className="texture-painter-buttons">
            <button onClick={undo} disabled={!steps || busy}>
              Undo stroke
            </button>
            <button onClick={reset} disabled={!ready || busy}>
              Clear highlights
            </button>
          </div>
          <p>
            Paint on the flat UV texture. Repeated UVs repeat the same
            highlights across hair strands. Transparent regions stay
            transparent.
          </p>
          <p>
            The highlight layer is editable in this dialog. Apply flattens it
            into the project texture; project Undo restores the previous
            texture.
          </p>
        </div>
        <div className="texture-painter-image">
          <canvas
            ref={canvas}
            aria-label="Texture painting canvas"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={finish}
            onPointerCancel={finish}
            onLostPointerCapture={finish}
          />
          <small>{ready ? dimensions : "Loading texture…"}</small>
        </div>
      </div>
      {error && (
        <p className="texture-painter-error" role="alert">
          {error}
        </p>
      )}
      <footer className="texture-painter-actions">
        <button onClick={() => callbacks.current.onClose()} disabled={busy}>
          Cancel
        </button>
        <button className="primary" onClick={apply} disabled={!ready || busy}>
          {busy ? "Working…" : "Apply painted texture"}
        </button>
      </footer>
    </dialog>,
    document.body,
  )
}
