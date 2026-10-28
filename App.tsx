import { useEffect, useState, FormEvent } from 'react'
import { sb } from './supabase'
import { calc } from './calc'

const ST = ['preparation', 'confirme', 'en_cours', 'termine', 'annule']
const CAT = ['Nourriture', 'Boissons', 'Personnel', 'Transport', 'Décoration', 'Location de matériel', 'Sonorisation', 'Électricité', 'Communication', 'Autres']
const fmt = (n: number, d = 'FC') => new Intl.NumberFormat('fr-FR').format(Math.round(n * 100) / 100) + ' ' + d
const num = (f: FormData, k: string) => Number(f.get(k) || 0)
const K = ({ l, v, c = '' }: { l: string; v: string; c?: string }) => <div className="c k"><small>{l}</small><b className={c}>{v}</b></div>
const NA = 'Données insuffisantes'

export default function App() {
  const [session, setSession] = useState<any>(undefined)
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  if (session === undefined) return <main>Chargement…</main>
  return session ? <Workspace /> : <Auth />
}

function Auth() {
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in')
  const [msg, setMsg] = useState('')
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMsg('')
    const f = new FormData(e.currentTarget), email = String(f.get('email')), password = String(f.get('password'))
    const r = mode === 'in' ? await sb.auth.signInWithPassword({ email, password })
      : mode === 'up' ? await sb.auth.signUp({ email, password, options: { data: { nom: f.get('nom') } } })
      : await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin })
    if (r.error) setMsg('Erreur : ' + r.error.message)
    else if (mode === 'up') setMsg('Compte créé. Vérifiez votre e-mail si une confirmation est demandée, puis connectez-vous.')
    else if (mode === 'reset') setMsg('Un e-mail de réinitialisation vous a été envoyé.')
  }
  return <main style={{ maxWidth: 420 }}>
    <h1>EventProfit</h1><p className="mut">Chaque événement mérite d’être rentable.</p>
    <form className="c" onSubmit={submit}>
      {mode === 'up' && <><label>Votre nom</label><input name="nom" required /></>}
      <label>Adresse e-mail</label><input name="email" type="email" required />
      {mode !== 'reset' && <><label>Mot de passe (8 caractères minimum)</label><input name="password" type="password" minLength={8} required /></>}
      <br /><button>{mode === 'in' ? 'Me connecter' : mode === 'up' ? 'Créer mon compte' : 'Envoyer le lien'}</button>
      {msg && <p className={msg.startsWith('Erreur') ? 'ko' : 'ok'}>{msg}</p>}
    </form>
    <div className="row"><button className="s" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'Créer un compte' : 'J’ai déjà un compte'}</button>
      <button className="s" onClick={() => setMode('reset')}>Mot de passe oublié</button></div>
  </main>
}

function Workspace() {
  const [co, setCo] = useState<any>(undefined)
  const load = async () => {
    const { data } = await sb.from('memberships').select('company_id, role, companies(nom, devise)').limit(1)
    setCo(data && data[0] ? { id: data[0].company_id, role: data[0].role, ...(data[0] as any).companies } : null)
  }
  useEffect(() => { load() }, [])
  if (co === undefined) return <main>Chargement…</main>
  if (co === null) return <main style={{ maxWidth: 420 }}><h2>Votre entreprise</h2>
    <form className="c" onSubmit={async e => { e.preventDefault(); const nom = String(new FormData(e.currentTarget).get('nom')); const { error } = await sb.rpc('create_company', { p_nom: nom }); if (error) alert('Erreur : ' + error.message); else load() }}>
      <label>Nom de l’entreprise</label><input name="nom" required /><br /><button>Créer mon espace</button></form></main>
  return <Main co={co} />
}

function Main({ co }: { co: any }) {
  const [tab, setTab] = useState<'home' | 'ev'>('home')
  const [openId, setOpenId] = useState<string | null>(null)
  const [ev, setEv] = useState<any[]>([]), [pay, setPay] = useState<any[]>([]), [dep, setDep] = useState<any[]>([])
  const [adding, setAdding] = useState(false), [q, setQ] = useState('')
  const reload = async () => {
    const [a, b, c] = await Promise.all([sb.from('events').select('*').order('date', { ascending: false }), sb.from('payments').select('*'), sb.from('expenses').select('*')])
    if (a.error || b.error || c.error) { alert('Erreur de chargement : ' + (a.error || b.error || c.error)!.message); return }
    setEv(a.data!); setPay(b.data!); setDep(c.data!)
  }
  useEffect(() => { reload() }, [])
  const d = co.devise
  const fin = (e: any) => calc(e, pay.filter(p => p.event_id === e.id), dep.filter(x => x.event_id === e.id))
  const active = ev.filter(e => !e.archive)
  const C = active.filter(e => e.statut !== 'annule').map(e => ({ e, c: fin(e) }))

  async function addEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget)
    const { error } = await sb.from('events').insert({ company_id: co.id, nom: f.get('nom'), date: f.get('date') || null, lieu: f.get('lieu'), budget: num(f, 'budget'), contrat: num(f, 'contrat'), statut: f.get('statut') })
    if (error) return alert('Erreur : ' + error.message)
    setAdding(false); reload()
  }
  const header = <header><b>{co.nom}</b><button className="s" style={{ color: '#fff', borderColor: '#fff6' }} onClick={() => sb.auth.signOut()}>Déconnexion</button></header>

  if (openId) { const e = ev.find(x => x.id === openId); if (e) return <>{header}<Detail e={e} co={co} pay={pay.filter(p => p.event_id === e.id)} dep={dep.filter(x => x.event_id === e.id)} reload={reload} back={() => setOpenId(null)} /></> }

  return <>{header}<main>
    {tab === 'home' && (C.length === 0
      ? <div className="c" style={{ textAlign: 'center', padding: 32 }}><h2>Bienvenue</h2><p className="mut">Vous n’avez encore aucun événement.</p><button onClick={() => { setTab('ev'); setAdding(true) }}>Créer mon premier événement</button></div>
      : <>
        <h2>Tableau de bord</h2>
        {C.filter(x => x.c.depasse).map(x => <div className="al" key={x.e.id}>⚠️ <b>{x.e.nom}</b> : dépenses réelles au-dessus du budget ou du prévu.</div>)}
        <div className="g">
          <K l="Événements" v={String(active.length)} />
          <K l="Recettes prévues (contrats)" v={fmt(C.reduce((t, x) => t + x.c.contrat, 0), d)} />
          <K l="Réellement encaissé" v={fmt(C.reduce((t, x) => t + x.c.encaisse, 0), d)} c="ok" />
          <K l="Dépenses réelles" v={fmt(C.reduce((t, x) => t + x.c.reel, 0), d)} />
          <K l="Bénéfice estimé" v={fmt(C.reduce((t, x) => t + (x.c.estime ?? 0), 0), d)} />
          <K l="Bénéfice réel (événements terminés)" v={C.some(x => x.c.resultat !== null) ? fmt(C.reduce((t, x) => t + (x.c.resultat ?? 0), 0), d) : NA} />
          <K l="Paiements en attente (soldes)" v={fmt(C.reduce((t, x) => t + Math.max(0, x.c.solde), 0), d)} c="wa" />
        </div></>)}
    {tab === 'ev' && <>
      <div className="row"><h2>Mes événements</h2><button onClick={() => setAdding(!adding)}>{adding ? 'Fermer' : '+ Nouvel événement'}</button></div>
      {adding && <form className="c" onSubmit={addEvent}>
        <label>Nom</label><input name="nom" required /><label>Date</label><input name="date" type="date" /><label>Lieu</label><input name="lieu" />
        <label>Budget prévu</label><input name="budget" type="number" min="0" step="any" /><label>Montant du contrat</label><input name="contrat" type="number" min="0" step="any" />
        <label>Statut</label><select name="statut">{ST.map(s => <option key={s}>{s}</option>)}</select><br /><button>Enregistrer</button></form>}
      <input placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 10 }} />
      {active.filter(e => e.nom.toLowerCase().includes(q.toLowerCase())).map(e => { const c = fin(e); return <div key={e.id} className="c" style={{ cursor: 'pointer' }} onClick={() => setOpenId(e.id)}>
        <div className="row"><b>{e.nom}</b><span className="tag">{e.statut}</span></div>
        <div className="row"><span>Contrat {fmt(c.contrat, d)}</span><span className={c.solde > 0 ? 'wa' : 'ok'}>Solde {fmt(c.solde, d)}</span></div></div> })}
    </>}
  </main>
    <nav><a className={tab === 'home' ? 'on' : ''} onClick={() => setTab('home')}>🏠 Accueil</a><a className={tab === 'ev' ? 'on' : ''} onClick={() => setTab('ev')}>📅 Événements</a></nav></>
}

function Detail({ e, co, pay, dep, reload, back }: any) {
  const d = co.devise, c = calc(e, pay, dep)
  const run = async (p: PromiseLike<{ error: any }>) => { const { error } = await p; if (error) alert('Erreur : ' + error.message); else reload() }
  const ask = (msg: string) => confirm(msg)
  return <main>
    <button className="s" onClick={back}>← Retour</button>
    <div className="row"><h2>{e.nom}</h2>
      <select value={e.statut} style={{ width: 'auto' }} onChange={ev => run(sb.from('events').update({ statut: ev.target.value }).eq('id', e.id))}>{ST.map(s => <option key={s}>{s}</option>)}</select></div>
    {c.depasse && <div className="al">⚠️ Dépassement budgétaire détecté.</div>}
    <div className="g">
      <K l="Contrat" v={fmt(c.contrat, d)} /><K l="Encaissé" v={fmt(c.encaisse, d)} c="ok" /><K l="Solde client" v={fmt(c.solde, d)} c={c.solde > 0 ? 'wa' : 'ok'} />
      <K l="Dépenses prévues" v={fmt(c.prevu, d)} /><K l="Dépenses réelles" v={fmt(c.reel, d)} />
      <K l="Budget restant" v={c.restant === null ? NA : fmt(c.restant, d)} c={c.restant !== null && c.restant < 0 ? 'ko' : ''} />
      <K l="Résultat estimé" v={c.estime === null ? NA : fmt(c.estime, d)} />
      <K l="Résultat réel" v={c.resultat === null ? NA : fmt(c.resultat, d)} c={c.resultat !== null && c.resultat < 0 ? 'ko' : 'ok'} />
      <K l="Marge" v={c.marge === null ? NA : c.marge.toFixed(1) + ' %'} /></div>
    {c.resultat === null && <p className="mut">Le résultat réel est calculé quand l’événement est « terminé » : un acompte n’est pas un bénéfice.</p>}

    <h3>Paiements</h3>
    <form className="c" onSubmit={ev => { ev.preventDefault(); const f = new FormData(ev.currentTarget); const form = ev.currentTarget
      run(sb.from('payments').insert({ company_id: co.id, event_id: e.id, date: f.get('date') || null, montant: num(f, 'montant'), mode: f.get('mode'), statut: f.get('statut') })).then(() => form.reset()) }}>
      <div className="g"><input name="date" type="date" /><input name="montant" type="number" min="0" step="any" placeholder="Montant" required />
        <select name="mode">{['Espèces', 'Mobile Money', 'Virement', 'Chèque'].map(m => <option key={m}>{m}</option>)}</select>
        <select name="statut"><option value="recu">reçu</option><option value="en_attente">en attente</option></select></div><br /><button>Ajouter le paiement</button></form>
    <div className="c sc"><table><tbody>{pay.map((p: any) => <tr key={p.id}><td>{p.date}</td><td>{fmt(p.montant, d)}</td><td>{p.mode}</td><td>{p.statut}</td>
      <td><button className="d" onClick={() => ask('Supprimer ce paiement ?') && run(sb.from('payments').delete().eq('id', p.id))}>Supprimer</button></td></tr>)}
      {!pay.length && <tr><td className="mut">Aucun paiement.</td></tr>}</tbody></table></div>

    <h3>Dépenses</h3>
    <form className="c" onSubmit={ev => { ev.preventDefault(); const f = new FormData(ev.currentTarget); const form = ev.currentTarget
      run(sb.from('expenses').insert({ company_id: co.id, event_id: e.id, libelle: f.get('libelle'), categorie: f.get('categorie'), montant_prevu: num(f, 'prevu'), montant_reel: num(f, 'reel'), statut: f.get('statut') })).then(() => form.reset()) }}>
      <div className="g"><input name="libelle" placeholder="Libellé" required /><select name="categorie">{CAT.map(x => <option key={x}>{x}</option>)}</select>
        <input name="prevu" type="number" min="0" step="any" placeholder="Prévu" /><input name="reel" type="number" min="0" step="any" placeholder="Réel" />
        <select name="statut">{['prevue', 'engagee', 'payee', 'annulee'].map(s => <option key={s}>{s}</option>)}</select></div><br /><button>Ajouter la dépense</button></form>
    <div className="c sc"><table><tbody>{dep.map((x: any) => <tr key={x.id}><td>{x.libelle}<br /><small className="mut">{x.categorie}</small></td><td>{fmt(x.montant_prevu, d)}</td><td>{fmt(x.montant_reel, d)}</td>
      <td><select value={x.statut} onChange={ev => run(sb.from('expenses').update({ statut: ev.target.value }).eq('id', x.id))}>{['prevue', 'engagee', 'payee', 'annulee'].map(s => <option key={s}>{s}</option>)}</select></td>
      <td><button className="d" onClick={() => ask('Supprimer cette dépense ?') && run(sb.from('expenses').delete().eq('id', x.id))}>Supprimer</button></td></tr>)}
      {!dep.length && <tr><td className="mut">Aucune dépense.</td></tr>}</tbody></table></div>
    <p className="mut">Changer le statut d’une dépense la garde sur une seule ligne : elle n’est jamais comptée deux fois.</p>
    <button className="d" onClick={() => ask('Supprimer définitivement cet événement et tout son contenu ?') && run(sb.from('events').delete().eq('id', e.id)).then(back)}>Supprimer l’événement</button>
  </main>
}
