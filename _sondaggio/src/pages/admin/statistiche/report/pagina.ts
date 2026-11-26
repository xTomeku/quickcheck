import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Modello } from './componi'
import Documento from './Documento'

// Il file del report: una pagina HTML che sta in piedi da sola, pensata per un foglio A4

// L'unico codice della pagina. La regola di sicurezza qui sotto ammette solo questo, riconosciuto
// dalla sua impronta: se si cambia anche un carattere va ricalcolata (sha256 in base64).
const CODICE = "document.getElementById('stampa').addEventListener('click',function(){window.print()})"
const IMPRONTA = '1VlzKO2Nk89b+U3diHlxbFn7KrD3tTrUtI49G9FGJFI='

const STILE = `
* { box-sizing: border-box; }
@page { size: A4 portrait; margin: 11mm 11mm 12mm; }
body { margin: 0; background: #f3f5f8; color: #16212a; font: 11px/1.45 Inter, "Segoe UI", system-ui, -apple-system, Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h1, h2, h3, p, ul, dl, dd { margin: 0; }
ul { padding: 0; list-style: none; }
.comandi { position: sticky; top: 0; z-index: 10; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 20px; background: #970f03; color: #fff; border-bottom: 3px solid #f7c321; font-size: 13px; }
.comandi button { border: 0; border-radius: 8px; padding: 9px 16px; background: #f7c321; color: #16212a; font: inherit; font-weight: 700; cursor: pointer; }
.foglio { max-width: 210mm; margin: 18px auto; padding: 22px 24px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(15, 23, 42, .08); }
.testata { display: flex; align-items: center; gap: 14px; padding-bottom: 12px; border-bottom: 3px solid #970f03; }
.testata img { width: 54px; height: 54px; object-fit: contain; }
.testata > div { flex: 1; min-width: 0; }
.soprattitolo { font-size: 9.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #970f03; }
h1 { font-size: 20px; line-height: 1.25; }
.pillola { padding: 5px 10px; border: 1px solid #a7f3d0; border-radius: 99px; background: #ecfdf5; color: #065f46; font-size: 10px; font-weight: 700; white-space: nowrap; }
.tenue { color: #64748b; font-size: 9.5px; }
.filtri { display: flex; flex-wrap: wrap; gap: 4px 22px; padding: 9px 0 10px; }
.filtri dt { font-size: 8.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #64748b; }
.filtri dd { font-weight: 600; }
.avviso { margin-bottom: 10px; padding: 7px 11px; border-radius: 8px; background: #fff7d6; font-weight: 600; }
.tessere { display: grid; grid-template-columns: repeat(auto-fit, minmax(135px, 1fr)); gap: 9px; margin-bottom: 11px; }
.tessere.per-tre { grid-template-columns: repeat(3, 1fr); }
.tessera { padding: 9px 11px; border: 1px solid #e2e8f0; border-top: 3px solid #247a9a; border-radius: 9px; background: #fafbfc; }
.tessera-nome { font-size: 9px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #64748b; }
.tessera-valore { font-size: 23px; font-weight: 800; line-height: 1.3; font-variant-numeric: tabular-nums; }
.colonne { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.colonne .barre li { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr) 30px; }
.riquadro { margin-bottom: 11px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; break-inside: avoid; }
.riquadro-titolo { margin-bottom: 8px; font-size: 12px; font-weight: 800; }
.ciambella { display: flex; align-items: center; gap: 14px; }
.ciambella svg { flex: none; }
.legenda { flex: 1; }
.legenda li { display: grid; grid-template-columns: 10px 1fr auto 34px; align-items: center; gap: 7px; padding: 2.5px 0; font-variant-numeric: tabular-nums; text-align: right; }
.legenda-nome { text-align: left; }
.legenda-numero { color: #64748b; }
.quadratino { display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
.pista { display: block; height: 7px; border-radius: 99px; background: #eef1f5; overflow: hidden; }
.piena { display: block; height: 100%; border-radius: 99px; background: #247a9a; }
.barre li { display: grid; grid-template-columns: minmax(0, 15fr) minmax(0, 20fr) 66px; align-items: center; gap: 9px; padding: 2.5px 0; break-inside: avoid; }
.barre-nome { overflow-wrap: anywhere; }
.barre-valore { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
.estremi li { padding: 3px 0; }
.estremi-testa { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 2px; }
.capitolo { break-before: page; }
.parte { margin-top: 16px; }
.titolo-parte { margin-bottom: 8px; padding-bottom: 5px; border-bottom: 2px solid #970f03; font-size: 14.5px; break-after: avoid; }
table { width: 100%; border-collapse: collapse; }
thead { display: table-header-group; }
th { padding: 5px 8px; background: #16212a; color: #fff; font-size: 9.5px; text-align: left; }
td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
tr { break-inside: avoid; }
tbody tr:nth-child(even) { background: #f8fafc; }
th.num, td.num { width: 76px; text-align: right; font-variant-numeric: tabular-nums; }
th.scala, td.scala { width: 150px; padding-left: 14px; padding-right: 14px; }
th.scala span { float: left; }
th.scala span + span { float: right; }
.linea { position: relative; display: block; height: 2px; background: #cbd5e1; }
.punto { position: absolute; top: -4px; width: 10px; height: 10px; margin-left: -5px; border-radius: 99px; background: #247a9a; box-shadow: 0 0 0 2px #fff; }
.punto.incerto { border: 2px solid #94a3b8; background: #fff; }
.etichetta { display: inline-block; margin-left: 6px; padding: 0 6px; border-radius: 99px; background: #fff7d6; color: #16212a; font-size: 8.5px; font-weight: 600; }
.senza { margin-top: 8px; color: #475569; font-size: 9.5px; }
.gruppo { margin-bottom: 12px; }
.gruppo-testa { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 6px; break-after: avoid; }
.gruppo-testa h3 { font-size: 12.5px; color: #970f03; }
.chiave { display: flex; align-items: center; gap: 3px; color: #64748b; font-size: 9px; }
.domanda { margin-bottom: 6px; padding: 8px 11px 9px; border: 1px solid #e2e8f0; border-radius: 9px; break-inside: avoid; }
.domanda-testa { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 5px; }
.domanda-testo { font-size: 11px; font-weight: 600; }
.voto { font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums; }
.impilata { display: flex; gap: 1.5px; height: 17px; border-radius: 4px; overflow: hidden; }
.impilata span { flex-basis: 0; min-width: 2px; overflow: hidden; font-size: 9px; line-height: 17px; text-align: center; white-space: nowrap; }
.scritte { margin-bottom: 12px; }
.scritte h3 { margin-bottom: 4px; font-size: 12px; break-after: avoid; }
.scritte-gruppo { margin: 7px 0 3px; color: #970f03; font-weight: 700; break-after: avoid; }
.scritte-gruppo span { margin-left: 5px; color: #64748b; font-weight: 400; }
.scritte li { margin-bottom: 4px; padding: 5px 9px; border-left: 3px solid #a9d4e4; background: #f8fafc; white-space: pre-wrap; overflow-wrap: anywhere; break-inside: avoid; }
.note { margin-top: 16px; padding: 9px 12px; border: 1px solid #e2e8f0; border-left: 4px solid #16212a; border-radius: 8px; background: #f8fafc; color: #334155; font-size: 9.5px; break-inside: avoid; }
@media screen and (max-width: 640px) {
  .foglio { margin: 0; padding: 16px; border-radius: 0; }
  .testata { flex-wrap: wrap; }
  .colonne { grid-template-columns: 1fr; }
  th.scala, td.scala { display: none; }
}
@media print {
  body { background: #fff; }
  .comandi { display: none; }
  .foglio { max-width: none; margin: 0; padding: 0; border-radius: 0; box-shadow: none; }
}
`

const neutralizza = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// `nome` diventa il titolo della pagina, che il browser propone come nome del PDF
export function paginaHtml(modello: Modello, logo: string, nome: string) {
  const regole = `default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'sha256-${IMPRONTA}'; base-uri 'none'; form-action 'none'`
  return [
    '<!doctype html>',
    '<html lang="it">',
    '<head>',
    '<meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${regole}">`,
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="robots" content="noindex">',
    `<title>${neutralizza(nome)}</title>`,
    `<style>${STILE}</style>`,
    '</head>',
    '<body>',
    renderToStaticMarkup(createElement(Documento, { modello, logo })),
    `<script>${CODICE}</script>`,
    '</body>',
    '</html>',
  ].join('\n')
}
