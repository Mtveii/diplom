/**
 * Выгрузка таблицы в CSV (BOM для кириллицы в Excel).
 * Только клиентская генерация, без зависимостей.
 */
const CSV_BOM = '\uFEFF'

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>): void {
  const escape = (cell: string | number | null | undefined): string => {
    const text = cell == null ? '' : String(cell)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const lines = [headers, ...rows].map((row) => row.map(escape).join(','))
  const blob = new Blob([CSV_BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
