import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal — meridian panel.
          Mobile: bottom-sheet (rounded top corners, full width, max 90dvh).
          Uses `dvh` so the panel shrinks when the soft keyboard opens and
          the submit button (sticky inside) stays reachable.
          md+:    centered card with side margin. */}
      <div
        className="helm-card relative w-full max-h-[90dvh] overflow-y-auto md:max-w-lg md:max-h-[85dvh] md:mx-4 md:rounded-xl rounded-t-xl shadow-soft-lg animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
          <h2
            id="modal-title"
            className="font-display text-xl font-normal text-ink"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink p-1 -mr-1 transition-colors duration-200 ease-snappy"
            aria-label="Close modal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}

export { Modal }
