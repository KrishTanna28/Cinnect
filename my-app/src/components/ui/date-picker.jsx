"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

export function DatePicker({ value, onChange, max, required, id, error, placeholder = "Select date" }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Parse the value (YYYY-MM-DD string) into a viewed month/year
  const parsed = value ? new Date(value + "T00:00:00") : null
  const [viewYear, setViewYear] = useState(parsed ? parsed.getFullYear() : new Date().getFullYear() - 18)
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.getMonth() : new Date().getMonth())
  const [yearSelectOpen, setYearSelectOpen] = useState(false)

  const maxDate = max ? new Date(max + "T00:00:00") : null

  // Sync view when value changes externally
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.getFullYear())
      setViewMonth(parsed.getMonth())
    }
  }, [value])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setYearSelectOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(y => y - 1)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(y => y + 1)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  const selectDay = (day) => {
    const mm = String(viewMonth + 1).padStart(2, "0")
    const dd = String(day).padStart(2, "0")
    onChange(`${viewYear}-${mm}-${dd}`)
    setOpen(false)
  }

  const isSelected = (day) => {
    if (!parsed) return false
    return parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth && parsed.getDate() === day
  }

  const isDisabled = (day) => {
    if (!maxDate) return false
    const d = new Date(viewYear, viewMonth, day)
    return d > maxDate
  }

  const isToday = (day) => {
    const today = new Date()
    return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

  // Year range for the year selector
  const currentYear = new Date().getFullYear()
  const years = []
  for (let y = currentYear; y >= currentYear - 120; y--) {
    years.push(y)
  }

  const displayValue = parsed
    ? parsed.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "long", day: "numeric", year: "numeric" })
    : null

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        id={id}
        onClick={() => { setOpen(o => !o); setYearSelectOpen(false) }}
        className={`flex items-center w-full h-9 rounded-md border px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none cursor-pointer
          ${error
            ? "border-destructive"
            : open
              ? "border-ring ring-ring/50 ring-[3px]"
              : "border-input hover:border-ring/50"
          }
          dark:bg-input/30 bg-transparent
          ${displayValue ? "text-foreground" : "text-muted-foreground"}
        `}
      >
        <Calendar className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
        <span className="flex-1 text-left truncate">
          {displayValue || placeholder}
        </span>
      </button>
      {required && !value && (
        <input
          tabIndex={-1}
          className="absolute inset-0 opacity-0 pointer-events-none"
          required
          value={value || ""}
          onChange={() => {}}
        />
      )}

      {/* Calendar dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 left-0 w-[300px] rounded-lg border border-border bg-popover text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              {/* Month select */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-transparent border-none text-sm font-semibold text-foreground cursor-pointer hover:text-primary transition-colors focus:outline-none pr-5"
                style={{ backgroundPosition: "right 0.25rem center", backgroundSize: "0.75rem" }}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>

              {/* Year select */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-transparent border-none text-sm font-semibold text-foreground cursor-pointer hover:text-primary transition-colors focus:outline-none pr-5"
                style={{ backgroundPosition: "right 0.25rem center", backgroundSize: "0.75rem" }}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-3 pt-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1.5">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 px-3 pb-3">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const selected = isSelected(day)
              const disabled = isDisabled(day)
              const today = isToday(day)

              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(day)}
                  className={`
                    h-8 w-full rounded-md text-sm transition-colors relative
                    ${disabled
                      ? "text-muted-foreground/40 cursor-not-allowed"
                      : selected
                        ? "bg-primary text-primary-foreground font-semibold"
                        : today
                          ? "bg-secondary/60 text-foreground font-medium hover:bg-primary/20"
                          : "text-foreground hover:bg-secondary/60 cursor-pointer"
                    }
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Today shortcut */}
          <div className="border-t border-border px-3 py-2 flex justify-center">
            <button
              type="button"
              onClick={() => {
                const today = new Date()
                if (maxDate && today > maxDate) return
                setViewYear(today.getFullYear())
                setViewMonth(today.getMonth())
                selectDay(today.getDate())
              }}
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
