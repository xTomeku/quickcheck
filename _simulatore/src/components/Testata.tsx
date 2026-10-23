interface Props {
  /**
   * Se c'è, la barra riporta all'inizio del simulatore invece che al sito di QuickCheck:
   * fuori dalla home il ritorno che serve è quello, non l'uscita.
   */
  onInizio?: () => void
}

/** Barra in alto: marchio QuickCheck, distintivo di udu Lecce e il ritorno
    (il simulatore vive in /quickcheck/simulatore/). */
export function Testata({ onInizio }: Props) {
  return (
    <header className="qc-barra">
      <div className="interno">
        <div className="qc-sinistra">
          <a className="qc-marchio" href="../">
            <img
              src="../assets/logo.png"
              alt=""
              width={30}
              height={30}
              onError={(e) => {
                e.currentTarget.src = 'icona.svg'
              }}
            />
            <b>QuickCheck</b>
            <span>Simulatore</span>
          </a>
          <img className="udu-distintivo" src="udu-lecce-distintivo.svg" alt="udu Lecce" width={34} height={34} />
        </div>
        {onInizio ? (
          <button type="button" className="qc-torna" onClick={onInizio}>
            Torna all'inizio
          </button>
        ) : (
          <a className="qc-torna" href="../">
            Torna al sito
          </a>
        )}
      </div>
    </header>
  )
}
