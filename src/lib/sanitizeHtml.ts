/**
 * Sanitize HTML content from TinyMCE editor
 * - Removes unwanted inline styles (margins, fonts, colors, etc.)
 * - Preserves: font-weight, text-decoration, font-style (for bold, underline, italic)
 * - Removes empty paragraphs and other empty block elements
 */
export function sanitizeHtmlContent(html: string | null | undefined): string {
  if (!html) return ''

  let sanitized = html

  // CSS properties to KEEP (for bold, underline, italic)
  const allowedProps = ['font-weight', 'text-decoration', 'font-style']

  // Process each style attribute
  sanitized = sanitized.replace(/style\s*=\s*["']([^"']*)["']/gi, (match, styleContent) => {
    if (!styleContent || !styleContent.trim()) return ''

    // Parse style properties
    const props = styleContent.split(';').filter((p: string) => p.trim())
    const keptProps: string[] = []

    for (const prop of props) {
      const colonIndex = prop.indexOf(':')
      if (colonIndex === -1) continue

      const propName = prop.substring(0, colonIndex).trim().toLowerCase()
      const propValue = prop.substring(colonIndex + 1).trim()

      // Keep only allowed properties with valid values
      if (allowedProps.includes(propName) && propValue) {
        keptProps.push(`${propName}: ${propValue}`)
      }
    }

    // Return cleaned style or remove attribute entirely
    if (keptProps.length > 0) {
      return `style="${keptProps.join('; ')}"`
    }
    return ''
  })

  // Remove empty paragraphs: <p></p>, <p> </p>, <p>&nbsp;</p>, <p><br></p>, <p><br/></p>
  sanitized = sanitized.replace(/<p[^>]*>\s*(?:&nbsp;|\s|<br\s*\/?>)*\s*<\/p>/gi, '')

  // Remove empty divs, spans with only whitespace
  sanitized = sanitized.replace(/<(div|span)[^>]*>\s*(?:&nbsp;|\s)*<\/\1>/gi, '')

  // Remove multiple consecutive <br> tags (keep max 2)
  sanitized = sanitized.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>')

  // Remove leading/trailing whitespace
  sanitized = sanitized.trim()

  // If only whitespace or empty tags remain, return empty string
  if (sanitized.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim() === '') {
    return ''
  }

  return sanitized
}
