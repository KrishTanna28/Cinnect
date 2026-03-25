"use client"

import { useState, useEffect, useRef } from "react"

export default function RatingSpeedometer({ rating = 0, size: propSize = 120 }) {
  const [animatedRating, setAnimatedRating] = useState(0)
  const [size, setSize] = useState(propSize)
  const canvasRef = useRef(null)

  // Responsive size based on window width
  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth
      if (width >= 1280) {
        // xl and above - large desktop
        setSize(280)
      } else if (width >= 1024) {
        // lg - desktop
        setSize(240)
      } else if (width >= 768) {
        // md - tablet
        setSize(200)
      } else if (width >= 640) {
        // sm - large mobile
        setSize(180)
      } else {
        // mobile
        setSize(160)
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Animate the rating value on mount/change
  useEffect(() => {
    const duration = 1000 // ms
    const startTime = Date.now()
    const startValue = animatedRating

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + (rating - startValue) * easeOutCubic

      setAnimatedRating(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [rating])

  // Draw the speedometer on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    // Set canvas size with device pixel ratio for sharp rendering
    canvas.width = size * dpr
    canvas.height = (size * 0.65) * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size * 0.65}px`
    ctx.scale(dpr, dpr)

    const centerX = size / 2
    const centerY = size * 0.55
    const radius = size * 0.4
    const lineWidth = size * 0.08

    // Clear canvas
    ctx.clearRect(0, 0, size, size * 0.65)

    // Draw background arc (gray track)
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, Math.PI, 0, false)
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineCap = 'round'
    ctx.stroke()

    // Calculate the color based on rating
    const getColor = (value) => {
      if (value < 3) return '#ef4444' // Red for poor
      if (value < 5) return '#f97316' // Orange for below average
      if (value < 7) return '#eab308' // Yellow for average
      if (value < 8.5) return '#84cc16' // Light green for good
      return '#22c55e' // Green for excellent
    }

    // Draw colored progress arc
    const startAngle = Math.PI
    const endAngle = Math.PI + (animatedRating / 10) * Math.PI

    // Create gradient for the arc
    const gradient = ctx.createLinearGradient(
      centerX - radius, centerY,
      centerX + radius, centerY
    )
    gradient.addColorStop(0, '#ef4444')
    gradient.addColorStop(0.3, '#f97316')
    gradient.addColorStop(0.5, '#eab308')
    gradient.addColorStop(0.7, '#84cc16')
    gradient.addColorStop(1, '#22c55e')

    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, false)
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = gradient
    ctx.lineCap = 'round'
    ctx.stroke()

    // Draw tick marks
    const tickCount = 10
    const tickGap = size * 0.03
    const majorTickLength = size * 0.08
    const minorTickLength = size * 0.05
    for (let i = 0; i <= tickCount; i++) {
      const angle = Math.PI + (i / tickCount) * Math.PI
      const innerRadius = radius - lineWidth / 2 - tickGap
      const outerRadius = radius - lineWidth / 2 - (i % 5 === 0 ? majorTickLength : minorTickLength)

      const x1 = centerX + Math.cos(angle) * innerRadius
      const y1 = centerY + Math.sin(angle) * innerRadius
      const x2 = centerX + Math.cos(angle) * outerRadius
      const y2 = centerY + Math.sin(angle) * outerRadius

      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.lineWidth = i % 5 === 0 ? Math.max(2, size * 0.015) : Math.max(1, size * 0.008)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.stroke()
    }

    // Draw needle
    const needleAngle = Math.PI + (animatedRating / 10) * Math.PI
    const needleLength = radius - lineWidth / 2 - size * 0.12
    const needleX = centerX + Math.cos(needleAngle) * needleLength
    const needleY = centerY + Math.sin(needleAngle) * needleLength

    // Needle line
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.lineTo(needleX, needleY)
    ctx.lineWidth = Math.max(2.5, size * 0.02)
    ctx.strokeStyle = getColor(animatedRating)
    ctx.lineCap = 'round'
    ctx.stroke()

    // Needle center circle
    const centerCircleRadius = Math.max(6, size * 0.045)
    ctx.beginPath()
    ctx.arc(centerX, centerY, centerCircleRadius, 0, Math.PI * 2)
    ctx.fillStyle = getColor(animatedRating)
    ctx.fill()

    // Inner circle (dark)
    ctx.beginPath()
    ctx.arc(centerX, centerY, centerCircleRadius * 0.5, 0, Math.PI * 2)
    ctx.fillStyle = '#0a0a0a'
    ctx.fill()

  }, [animatedRating, size])

  // Get rating label
  const getRatingLabel = (value) => {
    if (value === 0) return "No Rating"
    if (value < 3) return "Poor"
    if (value < 5) return "Below Avg"
    if (value < 7) return "Average"
    if (value < 8.5) return "Good"
    return "Excellent"
  }

  // Get color for the label
  const getLabelColor = (value) => {
    if (value === 0) return "text-muted-foreground"
    if (value < 3) return "text-red-500"
    if (value < 5) return "text-orange-500"
    if (value < 7) return "text-yellow-500"
    if (value < 8.5) return "text-lime-500"
    return "text-green-500"
  }

  // Dynamic text size classes based on container size
  const getTextSizeClass = () => {
    if (size >= 240) return "text-4xl md:text-5xl"
    if (size >= 200) return "text-3xl md:text-4xl"
    if (size >= 160) return "text-2xl md:text-3xl"
    return "text-xl sm:text-2xl"
  }

  const getLabelSizeClass = () => {
    if (size >= 240) return "text-base md:text-lg"
    if (size >= 200) return "text-sm md:text-base"
    return "text-xs sm:text-sm"
  }

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        className="block"
      />
      <div className="text-center -mt-2">
        <div className={`font-bold ${getTextSizeClass()} ${getLabelColor(rating)}`}>
          {animatedRating.toFixed(1)}
        </div>
        <div className={`font-medium ${getLabelSizeClass()} ${getLabelColor(rating)}`}>
          {getRatingLabel(rating)}
        </div>
      </div>
    </div>
  )
}
