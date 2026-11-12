// Quotes every cell, and neutralises values that spreadsheet apps would run as formulas (CSV injection).
const cell = (value) => {
  let text = value == null ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export const toCsv = (rows) => rows.map((row) => row.map(cell).join(',')).join('\r\n')

// rows: arrays of cell values, the first being the header. The BOM makes Excel read UTF-8 correctly.
export const downloadCsv = (filename, rows) => {
  const blob = new Blob(['﻿', toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
