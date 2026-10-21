// Compila il simulatore e copia la build in ../simulatore, la sottocartella pubblicata del sito.
// Il sorgente sta in sito/_simulatore, quello che va online in sito/simulatore.
// Poi basta fare commit e push del sito: GitHub Pages lo pubblica su xtomeku.github.io/quickcheck/simulatore/
import { cpSync, existsSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const radice = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sito = resolve(radice, '..')
const destinazione = resolve(sito, 'simulatore')

if (!existsSync(resolve(sito, 'index.html'))) {
  console.error(`Non trovo il sito di QuickCheck in ${sito}. Il sorgente del simulatore deve stare in sito/_simulatore.`)
  process.exit(1)
}

execSync('npm run build', { cwd: radice, stdio: 'inherit' })
rmSync(destinazione, { recursive: true, force: true }) // toglie i file della build precedente
cpSync(resolve(radice, 'dist'), destinazione, { recursive: true })
console.log(`\nCopiato in ${destinazione}\nOra fai commit e push del sito.`)
