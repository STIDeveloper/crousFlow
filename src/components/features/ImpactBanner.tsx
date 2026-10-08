'use client'

import { useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'

function NumberTicker({ value, label }: { value: number; label: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (!isInView) return
    let start = 0
    const duration = 2000
    const increment = value / (duration / 16)

    const timer = setInterval(() => {
      start += increment
      if (start >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(start))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [isInView, value])

  return (
    <div ref={ref} className="flex flex-col items-center justify-center p-4">
      <span className="text-3xl md:text-4xl font-display font-bold text-forest">
        {displayValue.toLocaleString('fr-FR')}
      </span>
      <span className="text-sm font-medium text-ink/70 mt-1 text-center">{label}</span>
    </div>
  )
}

export function ImpactBanner() {
  return (
    <div className="w-full max-w-4xl mx-auto rounded-2xl bg-sage/20 border border-sage p-6 my-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-sage">
        <NumberTicker value={14250} label="Repas servis" />
        <NumberTicker value={3120} label="Portions sauvées" />
        <NumberTicker value={84000} label="Minutes gagnées" />
      </div>
    </div>
  )
}
