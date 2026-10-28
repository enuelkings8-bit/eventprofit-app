export type Pay = { montant: number; statut: 'recu' | 'en_attente' }
export type Dep = { montant_prevu: number; montant_reel: number; statut: 'prevue' | 'engagee' | 'payee' | 'annulee' }
export type EvFin = { contrat: number; budget: number; statut: string }
const sum = <T,>(a: T[], f: (x: T) => number) => a.reduce((t, x) => t + (Number(f(x)) || 0), 0)

export function calc(e: EvFin, pay: Pay[], dep: Dep[]) {
  const contrat = Number(e.contrat) || 0, budget = Number(e.budget) || 0
  const encaisse = sum(pay.filter(p => p.statut === 'recu'), p => p.montant)
  const actives = dep.filter(d => d.statut !== 'annulee')
  const prevu = sum(actives, d => d.montant_prevu)
  const reel = sum(actives.filter(d => d.statut === 'engagee' || d.statut === 'payee'), d => d.montant_reel)
  const resultat = e.statut === 'termine' && contrat > 0 ? contrat - reel : null // jamais basé sur les acomptes
  return {
    contrat, encaisse, solde: contrat - encaisse, prevu, reel,
    restant: budget > 0 ? budget - reel : null,
    estime: contrat > 0 ? contrat - prevu : null,
    resultat, marge: resultat === null ? null : (resultat / contrat) * 100,
    depasse: (budget > 0 && reel > budget) || (prevu > 0 && reel > prevu),
  }
}
