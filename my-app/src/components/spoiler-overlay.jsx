"use client"

import { useState } from "react"
import { AlertTriangle, Eye } from "lucide-react"

/**
 * SpoilerOverlay - Wraps content with a spoiler blur effect.
 *
 * Props:
 * - isSpoiler: boolean — whether this content is marked as a spoiler
 * - isOwnContent: boolean — if true, spoiler is never blurred (author can see own content)
 * - children: ReactNode — the content to potentially blur
 * - className: string — additional classes on the wrapper
 * - label: string — optional label for the spoiler badge (default: "SPOILER")
 */
export default function SpoilerOverlay({
  isSpoiler,
  isOwnContent = false,
  children,
  className = "",
  label = "SPOILER"
}) {
  const [revealed, setRevealed] = useState(false)

  // Don't blur if not a spoiler, if it's the author's own content, or if already revealed
  const shouldBlur = isSpoiler && !isOwnContent && !revealed

  return (
    <div className={`relative ${className}`}>
      {/* Spoiler Badge */}
      {isSpoiler && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-2 bg-destructive/20 text-destructive rounded text-xs font-semibold">
          <AlertTriangle className="w-3 h-3" />
          {label}
        </span>
      )}

      {/* Content with conditional blur */}
      <div
        className={`transition-all duration-300 ${
          shouldBlur ? "blur-md select-none pointer-events-none" : ""
        }`}
      >
        {children}
      </div>

      {/* Reveal button */}
      {shouldBlur && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <button
            onClick={() => setRevealed(true)}
            className="flex items-center gap-2 px-4 py-2 bg-destructive/90 hover:bg-destructive text-white rounded-lg text-sm font-semibold transition-colors shadow-lg cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            Click to Reveal Spoiler
          </button>
        </div>
      )}
    </div>
  )
}
