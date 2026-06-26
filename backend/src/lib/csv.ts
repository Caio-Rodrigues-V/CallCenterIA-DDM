const escapeCell = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => headers.map(header => escapeCell(row[header])).join(',')),
  ]
  return lines.join('\n')
}

export function sendCsv(res: { setHeader: (key: string, value: string) => void; send: (body: string) => void }, filename: string, rows: Record<string, unknown>[]): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(`\uFEFF${toCsv(rows)}`)
}
