import React, { useRef, useState, useId } from "react"
import { createPortal } from "react-dom"
import { HexColorPicker } from "react-colorful"

// Keep the editor in the browser's top layer, outside scrolling inspector panels.
// Draft edits are local: Apply creates one history entry; Cancel changes nothing.
export function ColorControl({
  value,
  onChange,
  disabled,
  "aria-label": label,
}) {
  const dialog = useRef(null)
  const trigger = useRef(null)
  const titleId = useId()
  const title = /color/i.test(label) ? label : `${label} color`
  const [draft, setDraft] = useState(value)
  const valid = /^#[0-9a-f]{6}$/i.test(draft)
  const open = () => {
    setDraft(value)
    dialog.current.showModal()
  }
  const close = () => dialog.current.close()
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="color-trigger"
        aria-label={label}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={open}
        data-color={value}
      >
        <span className="color-trigger-swatch" style={{ background: value }} />
        <span className="color-trigger-value">{value.toUpperCase()}</span>
      </button>
      {createPortal(
        <dialog
          ref={dialog}
          className="color-dialog"
          aria-labelledby={titleId}
          onClose={() => trigger.current?.focus()}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (valid) {
                onChange({ target: { value: draft.toLowerCase() } })
                close()
              }
            }}
          >
            <header className="color-dialog-heading">
              <div>
                <small>EDIT COLOR</small>
                <h2 id={titleId}>{title}</h2>
              </div>
              <button
                type="button"
                aria-label="Close color editor"
                onClick={close}
              >
                ×
              </button>
            </header>
            <div className="color-dialog-body">
              <HexColorPicker
                color={valid ? draft : value}
                onChange={setDraft}
              />
              <label className="hex-field">
                <span>Hex color</span>
                <input
                  aria-label="Hex color"
                  value={draft}
                  maxLength={7}
                  spellCheck={false}
                  autoComplete="off"
                  aria-invalid={!valid}
                  onChange={(e) =>
                    setDraft(
                      e.target.value.startsWith("#")
                        ? e.target.value
                        : "#" + e.target.value,
                    )
                  }
                />
              </label>
              <div className="color-comparison">
                <span>
                  <i style={{ background: value }} />
                  Current
                </span>
                <span>
                  <i style={{ background: valid ? draft : value }} />
                  New
                </span>
              </div>
              {!valid && (
                <p className="color-validation" role="status">
                  Enter six hex digits, for example #B9DDC9.
                </p>
              )}
            </div>
            <footer className="color-dialog-actions">
              <button type="button" onClick={close}>
                Cancel
              </button>
              <button className="primary" type="submit" disabled={!valid}>
                Apply color
              </button>
            </footer>
          </form>
        </dialog>,
        document.body,
      )}
    </>
  )
}
