import { describe, it, expect } from 'vitest'
import { calc } from './calc'
const pay = [{ montant: 300, statut: 'recu' as const }, { montant: 200, statut: 'en_attente' as const }]
const dep = [
  { montant_prevu: 400, montant_reel: 450, statut: 'payee' as const },
  { montant_prevu: 100, montant_reel: 0, statut: 'prevue' as const },
  { montant_prevu: 50, montant_reel: 50, statut: 'annulee' as const },
]
describe('calc', () => {
  const c = calc({ contrat: 1000, budget: 600, statut: 'termine' }, pay, dep)
  it('encaissé = paiements reçus seulement', () => expect(c.encaisse).toBe(300))
  it('solde client', () => expect(c.solde).toBe(700))
  it('prévu sans annulées', () => expect(c.prevu).toBe(500))
  it('réel sans double compte', () => expect(c.reel).toBe(450))
  it('budget restant', () => expect(c.restant).toBe(150))
  it('résultat et marge', () => { expect(c.resultat).toBe(550); expect(c.marge).toBe(55) })
  it('pas de résultat réel si non terminé', () => expect(calc({ contrat: 1000, budget: 600, statut: 'en_cours' }, pay, dep).resultat).toBeNull())
  it('pas de marge sans recette', () => expect(calc({ contrat: 0, budget: 0, statut: 'termine' }, [], []).marge).toBeNull())
})
