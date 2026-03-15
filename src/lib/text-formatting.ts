import DOMPurify from 'dompurify'

export interface TextFormat {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  heading?: 1 | 2 | 3
  list?: 'bullet' | 'ordered'
  link?: string
  blockquote?: boolean
}

export interface FormattedText {
  text: string
  format?: TextFormat
  start: number
  end: number
}

export interface EditorState {
  content: string
  formats: FormattedText[]
  selection: { start: number; end: number }
}

/**
 * Apply formatting to a text selection
 */
export function applyFormat(
  text: string,
  start: number,
  end: number,
  format: TextFormat,
): { text: string; markdown: string } {
  const selection = text.slice(start, end)
  let formattedText = selection
  let markdown = selection

  if (format.bold) {
    formattedText = `**${formattedText}**`
    markdown = `**${markdown}**`
  }

  if (format.italic) {
    formattedText = `*${formattedText}*`
    markdown = `*${markdown}*`
  }

  if (format.underline) {
    formattedText = `<u>${formattedText}</u>`
    markdown = `__${markdown}__`
  }

  if (format.strikethrough) {
    formattedText = `~~${formattedText}~~`
    markdown = `~~${markdown}~~`
  }

  if (format.heading) {
    const hashes = '#'.repeat(format.heading)
    formattedText = `${hashes} ${formattedText}`
    markdown = `${hashes} ${markdown}`
  }

  if (format.list === 'bullet') {
    const lines = formattedText.split('\n')
    formattedText = lines.map((line) => `\u2022 ${line}`).join('\n')
    markdown = lines.map((line) => `- ${line}`).join('\n')
  }

  if (format.list === 'ordered') {
    const lines = formattedText.split('\n')
    formattedText = lines.map((line, i) => `${i + 1}. ${line}`).join('\n')
    markdown = formattedText
  }

  if (format.link) {
    formattedText = `[${formattedText}](${format.link})`
    markdown = `[${markdown}](${format.link})`
  }

  if (format.blockquote) {
    const lines = formattedText.split('\n')
    formattedText = lines.map((line) => `> ${line}`).join('\n')
    markdown = formattedText
  }

  const newText = text.slice(0, start) + formattedText + text.slice(end)

  return { text: newText, markdown }
}

/**
 * Remove formatting from a text selection
 */
export function removeFormat(text: string, start: number, end: number): string {
  const selection = text.slice(start, end)

  const cleaned = selection
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^[\u2022\-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/<u>(.*?)<\/u>/g, '$1')

  return text.slice(0, start) + cleaned + text.slice(end)
}

/**
 * Convert rich text to plain text
 */
export function toPlainText(richText: string): string {
  return richText
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^[\u2022\-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/<[^>]+>/g, '')
}

/**
 * Convert rich text to HTML for display
 */
export function toHTML(richText: string): string {
  let html = richText
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/__(.*?)__/g, '<u>$1</u>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^>\s+(.*)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\n/g, '<br/>')

  html = html.replace(/^[\u2022\-*]\s+(.*)$/gm, '<li>$1</li>')
  // eslint-disable-next-line security/detect-unsafe-regex -- no catastrophic backtracking: greedy .* is bounded by line-level input and non-overlapping alternatives
  html = html.replace(/(<li>.*<\/li>)(<br\/?>)?/g, '<ul>$1</ul>')

  html = html.replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>')
  // eslint-disable-next-line security/detect-unsafe-regex -- same pattern as above, bounded .* with non-overlapping groups
  html = html.replace(/(<li>.*<\/li>)(<br\/?>)?/g, '<ol>$1</ol>')

  return sanitizeHTML(html)
}

/**
 * Sanitize HTML output using DOMPurify to prevent XSS attacks.
 * Only allows safe tags and attributes, and restricts URLs to http(s) and mailto schemes.
 */
export function sanitizeHTML(html: string): string {
  if (typeof window === 'undefined') return html
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'strong',
      'em',
      'u',
      'del',
      'h1',
      'h2',
      'h3',
      'ul',
      'ol',
      'li',
      'blockquote',
      'a',
      'p',
      'br',
      'span',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
  })
}

/**
 * Character and word counting utilities
 */
export function countCharacters(text: string, excludeSpaces = false): number {
  if (excludeSpaces) {
    return text.replace(/\s/g, '').length
  }
  return text.length
}

export function countWords(text: string): number {
  const words = text.trim().split(/\s+/)
  return words.filter((word) => word.length > 0).length
}

export function countLines(text: string): number {
  if (!text) return 0
  return text.split('\n').length
}

/**
 * Text validation utilities
 */
export function validateLength(
  text: string,
  minLength?: number,
  maxLength?: number,
): { valid: boolean; message?: string } {
  const length = text.length

  if (minLength !== undefined && length < minLength) {
    return {
      valid: false,
      message: `Text must be at least ${minLength} characters long`,
    }
  }

  if (maxLength !== undefined && length > maxLength) {
    return {
      valid: false,
      message: `Text must be no more than ${maxLength} characters long`,
    }
  }

  return { valid: true }
}

/**
 * Text sanitization for security (regex-based, operates on raw text).
 * For sanitizing HTML output, prefer `sanitizeHTML()` which uses DOMPurify.
 */
export function sanitizeText(text: string): string {
  return (
    text
      // eslint-disable-next-line security/detect-unsafe-regex -- unrolled loop pattern: [^<]* and (?!...)<[^<]* are non-overlapping, no catastrophic backtracking
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // eslint-disable-next-line security/detect-unsafe-regex -- unrolled loop pattern: same safe structure as script tag regex above
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, '')
  )
}
