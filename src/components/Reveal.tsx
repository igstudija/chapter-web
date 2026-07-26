'use client'

import { useEffect, useRef, useState } from 'react'

interface RevealProps {
  readonly children: React.ReactNode
  readonly className?: string
  /** Milliseconds to hold before this element animates, for staggered rows. */
  readonly delay?: number
  /** Render as something other than a `div` when the layout needs it. */
  readonly as?: 'div' | 'section' | 'li' | 'article'
}

/**
 * Fades and lifts its children the first time they scroll into view.
 *
 * Two things are deliberate. It disconnects after the first intersection, so a
 * long page does not keep dozens of observers alive and nothing re-animates
 * when the reader scrolls back up. And if `IntersectionObserver` is missing —
 * or the effect never runs at all — the element is shown immediately rather
 * than left at `opacity: 0`, because content that depends on an animation to
 * become visible is content that can disappear.
 */
export function Reveal({ children, className = '', delay = 0, as = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        }
      },
      // Fire a little before the element reaches the fold, so the motion has
      // finished by the time it is properly in the reader's view.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const Tag = as as React.ElementType

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
