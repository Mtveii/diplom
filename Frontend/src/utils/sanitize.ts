export function isHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value)
}

export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') {
    return html
  }
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  doc.querySelectorAll('script, style, iframe, object, embed, link, meta, base').forEach((node) => node.remove())
  doc.querySelectorAll('*').forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name.startsWith('on')) {
        element.removeAttribute(attribute.name)
      }
      if (
        (attribute.name === 'href' || attribute.name === 'src' || attribute.name === 'poster') &&
        /^\s*javascript:/i.test(attribute.value)
      ) {
        element.removeAttribute(attribute.name)
      }
    }
  })
  return doc.body.innerHTML
}
