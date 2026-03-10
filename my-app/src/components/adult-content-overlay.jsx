"use client"

import { useState } from "react"
import { ShieldAlert, Eye } from "lucide-react"

/**
 * AdultContentOverlay - Wraps content with an adult content blur effect.
 * Mirrors the SpoilerOverlay behavior for 18+ content.
 *
 * Props:
 * - isAdult: boolean — whether this content is flagged as adult
 * - isMinor: boolean — if true, content cannot be revealed (user is under 18)
 * - isOwnContent: boolean — if true, adult blur is never applied (author can see own content)
 * - children: ReactNode — the content to potentially blur
 * - className: string — additional classes on the wrapper
 */
export default function AdultContentOverlay({
  isAdult,
  isMinor = false,
  isOwnContent = false,
  children,
  className = "",
}) {
  const [revealed, setRevealed] = useState(false)

  // Don't blur if not adult content, or if it's the author's own content
  if (!isAdult) {
    return <div className={className}>{children}</div>
  }

  // Minor users cannot see adult content at all
  if (isMinor) {
    return (
      <div className={`relative ${className}`}>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-2 bg-orange-500/20 text-orange-400 rounded text-xs font-semibold">
          <ShieldAlert className="w-3 h-3" />
          18+ CONTENT
        </span>
        <div className="blur-xl select-none pointer-events-none opacity-30">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2 px-6 py-4 bg-card/95 border border-border rounded-xl text-center shadow-lg">
            <ShieldAlert className="w-8 h-8 text-orange-400" />
            <p className="text-sm font-semibold text-foreground">Age-Restricted Content</p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              This content is restricted to users 18 years and older.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const shouldBlur = !isOwnContent && !revealed

  return (
    <div className={`relative ${className}`}>
      {/* Adult Content Badge */}
      <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-2 bg-orange-500/20 text-orange-400 rounded text-xs font-semibold">
        <ShieldAlert className="w-3 h-3" />
        18+ CONTENT
      </span>

      {/* Content with conditional blur */}
      <div
        className={`transition-all duration-300 ${
          shouldBlur ? "blur-md select-none pointer-events-none" : ""
        }`}
      >
        {children}
      </div>

      {/* Reveal button (only for 18+ users) */}
      {shouldBlur && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <button
            onClick={() => setRevealed(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600/90 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            Click to Reveal Adult Content
          </button>
        </div>
      )}
    </div>
  )
}
