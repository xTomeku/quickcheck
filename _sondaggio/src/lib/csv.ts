// Lettura e scrittura di file CSV, pensata per i file salvati da Excel in italiano (separatore «;»)

export async function leggiTesto(file: File): Promise<string> {
  const contenuto = await file.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(contenuto)
  } catch {
    // Excel italiano salva spesso in Windows-1252 invece che in UTF-8
    return new TextDecoder('windows-1252').decode(contenuto)
  }
}

export function parseCsv(testo: string): string[][] {
  const pulito = testo.replace(/^﻿/, '')
  const primaRiga = pulito.split(/\r?\n/, 1)[0] ?? ''
  const separatore = [';', ',', '\t']
    .map((c) => ({ c, n: primaRiga.split(c).length }))
    .sort((a, b) => b.n - a.n)[0].c

  const righe: string[][] = []
  let riga: string[] = []
  let cella = ''
  let tra_virgolette = false

  for (let i = 0; i < pulito.length; i++) {
    const c = pulito[i]
    if (tra_virgolette) {
      if (c === '"' && pulito[i + 1] === '"') {
        cella += '"'
        i++
      } else if (c === '"') {
        tra_virgolette = false
      } else {
        cella += c
      }
    } else if (c === '"') {
      tra_virgolette = true
    } else if (c === separatore) {
      riga.push(cella)
      cella = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && pulito[i + 1] === '\n') i++
      riga.push(cella)
      righe.push(riga)
      riga = []
      cella = ''
    } else {
      cella += c
    }
  }
  if (cella !== '' || riga.length > 0) {
    riga.push(cella)
    righe.push(riga)
  }

  return righe.filter((r) => r.some((x) => x.trim() !== ''))
}

// BOM iniziale: serve a Excel per riconoscere le lettere accentate
export function creaCsv(righe: string[][]): string {
  const cella = (x: string) => (/[";\r\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x)
  return '﻿' + righe.map((r) => r.map(cella).join(';')).join('\r\n') + '\r\n'
}
