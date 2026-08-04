import Image from 'next/image'

/**
 * A member's or company's logo, fitted inside a box.
 *
 * Six call sites drew this by hand and each carried its own copy of two rules
 * that are easy to get wrong in opposite directions:
 *
 * **The width has to be a definite length.** Many of these logos are SVGs
 * carrying only a `viewBox` — a ratio, but no intrinsic size. `width: auto`
 * resolves those to nothing at all and the cell renders empty, which is exactly
 * how they disappeared from the members list once. `object-contain` does the
 * fitting instead, so a mark of any proportion sits inside the box without
 * being stretched.
 *
 * **The attributes must not match what CSS renders.** Next compares each
 * rendered dimension against its attribute and warns when exactly one of them
 * moved — and here CSS moves both, so an attribute that happens to equal the
 * rendered width makes the pair look one-sided. Doubling keeps them clear of it
 * while still describing the right aspect ratio for `srcset`.
 *
 * This is for logos boxed by width. The site's own logo in the header and on a
 * slide is sized by height instead (`h-10 w-auto`), which is safe for the same
 * reason in reverse: a definite height plus an intrinsic ratio resolves the
 * width.
 */
export function CompanyLogo({
  src,
  alt,
  width,
  height,
  className = '',
}: {
  readonly src: string
  readonly alt: string
  /** Box width in px. The logo is drawn exactly this wide. */
  readonly width: number
  /** Box height in px. The logo never exceeds it. */
  readonly height: number
  readonly className?: string
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width * 2}
      height={height * 2}
      className={`max-w-full object-contain ${className}`}
      style={{ width, maxHeight: height }}
    />
  )
}
