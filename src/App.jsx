import React, { useState, useEffect } from 'react'
import './styles.css'

const START_YEAR = 2020
const END_YEAR = 2100
const ROUNDS = 8
const START_WIDTH = 50 // ft

const DIFFICULTIES = {
  easy:   { label: 'Easy',   baseline: -8,  budget: 220 },
  normal: { label: 'Normal', baseline: -10, budget: 200 },
  hard:   { label: 'Hard',   baseline: -12, budget: 180 },
}

const OPTIONS = {
  NONE:     {key:'NONE',     title:'Do Nothing',           cost:0,   desc:'Draw a Wild Card (random event).'},
  NOURISH:  {key:'NOURISH',  title:'Beach Nourishment',    cost:15,  desc:'Reduce beach loss by 5 ft this decade.'},
  DUNES:    {key:'DUNES',    title:'Dune Restoration',     cost:5,   desc:'Reduce beach loss by 2 ft this decade.'},
  REEF:     {key:'REEF',     title:'Artificial Reef',      cost:100, desc:'Set base beach loss to –5 ft/dec for 30 years.'},
  SEAWALL:  {key:'SEAWALL',  title:'Seawall / Armoring',   cost:150, desc:'Set base beach loss to –20 ft/dec permanently.'},
  RETREAT:  {key:'RETREAT',  title:'Managed Retreat',      cost:150, desc:'Set beach loss to 0 for 3 decades.'},
}
const ORDER = ['NOURISH','DUNES','REEF','SEAWALL','RETREAT','NONE']

/** INLINE SVGs (data URIs) so buttons never go black.
 *  Each illustration matches the move.
 */
const svg = {
  nourish:
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><defs><linearGradient id='w' x1='0' x2='1'><stop offset='0' stop-color='%237dd3fc'/><stop offset='1' stop-color='%2338bdf8'/></linearGradient><linearGradient id='s' x1='0' x2='0' y1='0' y2='1'><stop offset='0' stop-color='%23f7e9c7'/><stop offset='1' stop-color='%23f4dba4'/></linearGradient></defs><rect width='800' height='500' fill='url(%23w)'/><rect x='420' y='0' width='380' height='500' fill='url(%23s)'/><path d='M600 360 l80 -20 v40 l-80 20 z' fill='%238b5e34' opacity='.8'/><rect x='520' y='340' width='60' height='40' rx='6' fill='%236b7280'/><rect x='500' y='350' width='40' height='30' rx='4' fill='%2394a3b8'/><circle cx='540' cy='390' r='12' fill='%23334155'/><circle cx='505' cy='390' r='10' fill='%23334155'/><path d='M515 360 Q470 330 420 340' stroke='%238b5e34' stroke-width='10' fill='none' stroke-linecap='round' opacity='.9'/></svg>",
  dunes:
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><defs><linearGradient id='w' x1='0' x2='1'><stop offset='0' stop-color='%237dd3fc'/><stop offset='1' stop-color='%2338bdf8'/></linearGradient><linearGradient id='s' x1='0' x2='0' y1='0' y2='1'><stop offset='0' stop-color='%23f7e9c7'/><stop offset='1' stop-color='%23f4dba4'/></linearGradient></defs><rect width='800' height='500' fill='url(%23w)'/><path d='M200 380 Q300 320 420 360 T720 360 L800 500 L0 500 Z' fill='url(%23s)'/><path d='M500 300 q-20 40 -10 90' stroke='%230a7f3f' stroke-width='6' stroke-linecap='round'/><path d='M540 300 q-10 40 5 90' stroke='%230a7f3f' stroke-width='6' stroke-linecap='round'/><path d='M450 320 q-20 40 -5 90' stroke='%230a7f3f' stroke-width='6' stroke-linecap='round'/><path d='M300 340 h240' stroke='%238b5e34' stroke-width='6' stroke-linecap='round'/><path d='M340 330 v40 M380 330 v40 M420 330 v40 M460 330 v40 M500 330 v40' stroke='%238b5e34' stroke-width='6' stroke-linecap='round'/></svg>",
  reef:
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><defs><linearGradient id='sea' x1='0' x2='0' y1='0' y2='1'><stop offset='0' stop-color='%231e3a8a'/><stop offset='1' stop-color='%230ea5e9'/></linearGradient></defs><rect width='800' height='500' fill='url(%23sea)'/><circle cx='260' cy='360' r='38' fill='%23225637'/><circle cx='360' cy='380' r='46' fill='%23225637'/><circle cx='460' cy='360' r='38' fill='%23225637'/><circle cx='360' cy='380' r='18' fill='%23000000' opacity='.25'/><circle cx='260' cy='360' r='12' fill='%23000000' opacity='.25'/><circle cx='460' cy='360' r='12' fill='%23000000' opacity='.25'/><path d='M150 260 q80 -40 160 0' stroke='%2300e5ff' stroke-width='3' opacity='.5' fill='none'/><path d='M350 240 q100 -40 200 0' stroke='%2300e5ff' stroke-width='3' opacity='.5' fill='none'/></svg>",
  seawall:
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><defs><linearGradient id='w' x1='0' x2='1'><stop offset='0' stop-color='%237dd3fc'/><stop offset='1' stop-color='%2338bdf8'/></linearGradient><linearGradient id='rock' x1='0' x2='0' y1='0' y2='1'><stop offset='0' stop-color='%2399a2ad'/><stop offset='1' stop-color='%236b7280'/></linearGradient><linearGradient id='s' x1='0' x2='0' y1='0' y2='1'><stop offset='0' stop-color='%23f7e9c7'/><stop offset='1' stop-color='%23f4dba4'/></linearGradient></defs><rect width='800' height='500' fill='url(%23w)'/><rect x='520' y='0' width='280' height='500' fill='url(%23s)'/><path d='M520 300 l-120 60 l120 60 z' fill='url(%23rock)'/><circle cx='420' cy='360' r='24' fill='%23788599'/><circle cx='480' cy='340' r='20' fill='%237b8694'/><path d='M460 260 q-60 20 -40 60' stroke='%23ffffff' stroke-width='6' opacity='.6' fill='none'/></svg>",
  retreat:
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><defs><linearGradient id='w' x1='0' x2='1'><stop offset='0' stop-color='%237dd3fc'/><stop offset='1' stop-color='%2338bdf8'/></linearGradient><linearGradient id='s' x1='0' x2='0' y1='0' y2='1'><stop offset='0' stop-color='%23f7e9c7'/><stop offset='1' stop-color='%23f4dba4'/></linearGradient></defs><rect width='800' height='500' fill='url(%23w)'/><rect x='500' y='0' width='300' height='500' fill='url(%23s)'/><rect x='560' y='310' width='70' height='50' fill='%23ffffff'/><polygon points='560,310 595,280 630,310' fill='%2394a3b8'/><rect x='650' y='290' width='80' height='60' fill='%23ffffff'/><polygon points='650,290 690,260 730,290' fill='%2394a3b8'/><path d='M540 350 l-40 0' stroke='%23000000' stroke-width='4' marker-end='url(%23a)'/><defs><marker id='a' markerWidth='8' markerHeight='8' refX='3' refY='3' orient='auto'><path d='M0,0 L6,3 L0,6 Z' fill='%23000000'/></marker></defs></svg>",
  none:
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><defs><linearGradient id='w' x1='0' x2='1'><stop offset='0' stop-color='%237dd3fc'/><stop offset='1' stop-color='%2338bdf8'/></linearGradient></defs><rect width='800' height='500' fill='url(%23w)'/><path d='M0 320 q80 -40 160 0 t160 0 t160 0 t160 0 t160 0' stroke='%23ffffff' stroke-width='6' fill='none' opacity='.6'/></svg>",
}

// Use inline art for ALL move cards (no external CDNs)
const MOVE_BG = {
  NOURISH: [svg.nourish],
  DUNES:   [svg.dunes],
  REEF:    [svg.reef],
  SEAWALL: [svg.seawall],
  RETREAT: [svg.retreat],
  NONE:    [svg.none],
}

// Wild-card images (we can keep photos; UI already working well)
const WILDCARD_IMGS = {
  STORM: [
    'https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?q=80&w=1800&auto=format&fit=crop'
  ],
  RECALL: [
    'https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1800&auto=format&fit=crop'
  ],
  LA_NINA: [
    'https://images.unsplash.com/photo-1501959915551-4e8a04a2b59a?q=80&w=1800&auto=format&fit=crop'
  ],
  KING_TIDE: [
    'https://images.unsplash.com/photo-1522512115668-c09775d6f424?q=80&w=1800&auto=format&fit=crop'
  ],
  EMISSIONS: [
    'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa7?q=80&w=1800&auto=format&fit=crop'
  ],
}

const WILDCARDS = [
  { key: 'STORM',     name: '100-Year Storm',     text: 'A powerful storm slams the coast.' },
  { key: 'RECALL',    name: 'Recall',             text: 'Your policy decision is overturned.' },
  { key: 'LA_NINA',   name: 'La Niña Year',       text: 'Unusually calm ocean conditions this year.' },
  { key: 'KING_TIDE', name: 'King Tide Flooding', text: 'Extreme high tides flood streets and infrastructure.' },
  { key: 'EMISSIONS', name: 'Emissions Reduction',text: 'Global shift lowers long-term sea-level rise rate.' },
]

function prettyMoney(m){ return `$${m.toFixed(0)}M` }

export default function App(){
  const [difficulty, setDifficulty] = useState('normal')
  const [selected, setSelected] = useState('NOURISH')
  const [showIntro, setShowIntro] = useState(true) // show by default
  const INTRO_KEY = 'stb_hide_intro_v2'           // new key so it shows this version

  useEffect(() => {
    try {
      const hide = localStorage.getItem(INTRO_KEY) === '1'
      if (hide) setShowIntro(false)
    } catch {}
  }, [])

  function initialState(diffKey = difficulty){
    const diff = DIFFICULTIES[diffKey]
    return {
      year: START_YEAR,
      round: 1,
      width: START_WIDTH,
      budget: diff.budget,
      baseBaseline: diff.baseline, // –8/–10/–12; EMISSIONS can improve to –5
      reefBuilt: false,
      reefRoundsLeft: 0,
      seawallBuilt: false,
      retreatRoundsLeft: 0,
      lastRate: null,
      lastBaseRate: null,
      log: [`Start ${START_YEAR}: Beach=${START_WIDTH} ft, Budget=${prettyMoney(diff.budget)}, Baseline ${diff.baseline} ft/dec.`],
      gameOver: false,
      victory: false,
      history: [{year:START_YEAR, width:START_WIDTH, budget:diff.budget}],
      past: [],
    }
  }
  const [s, setS] = useState(initialState())
  const [wildModal, setWildModal] = useState(null)

  const badge = s.gameOver
    ? (s.victory ? <span className="badge green">Finished 🎉</span> : <span className="badge red">Game Over</span>)
    : <span className="badge blue">Round {s.round}/{ROUNDS}</span>

  // Priority: Retreat (0) > Seawall (–20) > Reef active (max(base, –5)) > Baseline
  function currentBaseRate(state){
    if (state.retreatRoundsLeft > 0) return 0
    if (state.seawallBuilt) return -20
    let base = state.baseBaseline
    if (state.reefRoundsLeft > 0) base = Math.max(base, -5)
    return base
  }

  function computeThisDecade(choice, state){
    const baseRate = currentBaseRate(state)
    let rate = baseRate
    let cost = 0
    const notes = []

    switch (choice){
      case 'NOURISH':
        cost -= OPTIONS.NOURISH.cost
        rate = baseRate + 5
        notes.push('Beach Nourishment: reduced loss by 5 ft this decade.')
        break
      case 'DUNES':
        cost -= OPTIONS.DUNES.cost
        rate = baseRate + 2
        notes.push('Dune Restoration: reduced loss by 2 ft this decade.')
        break
      case 'REEF': {
        if (!state.reefBuilt){
          cost -= OPTIONS.REEF.cost
          notes.push('Built Artificial Reef: base loss becomes –5 ft/dec for 30 years.')
          if (state.retreatRoundsLeft === 0 && !state.seawallBuilt){
            rate = Math.max(baseRate, -5) // immediate effect this decade
          }
        } else {
          notes.push(state.reefRoundsLeft > 0 ? 'Reef already active.' : 'Reef effect ended.')
          rate = baseRate
        }
        break
      }
      case 'SEAWALL':
        if (!state.seawallBuilt){
          cost -= OPTIONS.SEAWALL.cost
          notes.push('Built Seawall: base loss becomes –20 ft/dec permanently.')
        } else {
          notes.push('Seawall already built.')
        }
        rate = baseRate
        break
      case 'RETREAT':
        cost -= OPTIONS.RETREAT.cost
        notes.push('Managed Retreat: 0 ft loss for this and the next 2 decades.')
        rate = 0
        break
      default:
        notes.push('Chose to do nothing → draw a Wild Card.')
    }
    return { baseRate, rate, cost, notes }
  }

  function drawWild(){ return WILDCARDS[Math.floor(Math.random() * WILDCARDS.length)] }

  function applyWild(card, state, baseCalc){
    let { rate, cost } = baseCalc
    const notes = [`Wild Card: ${card.name}.`]
    let why = ''
    let futureNote = ''
    let budgetChange = 0
    let widthChangeFromWild = 0

    switch(card.key){
      case 'STORM':
        widthChangeFromWild = -20
        rate += -20
        why = 'Storm surge + large swell erode dunes and the active beach face.'
        notes.push('100-Year Storm → additional –20 ft this decade.')
        break
      case 'RECALL':
        if (state.lastRate !== null && state.lastBaseRate !== null){
          const improvement = state.lastRate - state.lastBaseRate // e.g., (-5) - (-10) = +5
          widthChangeFromWild = -improvement
          rate += -improvement
          why = 'Policy reversal removes last decade’s management benefit.'
          notes.push('Recall → reversed last decade’s management benefit on width.')
        } else {
          why = 'No prior management to reverse this time.'
          notes.push('Recall had no effect (no prior management recorded).')
        }
        break
      case 'LA_NINA':
        widthChangeFromWild = -rate  // cancels whatever the rate was
        rate = 0
        why = 'Cooler equatorial Pacific → calmer wave climate → minimal erosion.'
        notes.push('La Niña → 0 ft change this decade.')
        break
      case 'KING_TIDE':
        budgetChange = -30
        cost += -30
        why = 'Emergency response and repairs during extreme high tide.'
        notes.push('King Tide → –$30M budget immediately.')
        break
      case 'EMISSIONS': {
        const before = rate           // e.g., -10
        rate = Math.max(rate, -5)     // improve to -5 this decade
        widthChangeFromWild = rate - before // e.g., +5 improvement
        why = 'Rapid decarbonization slows sea-level rise starting now.'
        futureNote = 'Baseline set to –5 ft/decade from now on.'
        notes.push('Emissions cut → baseline improves to –5 ft/decade immediately and going forward.')
        break
      }
    }

    return { rate, cost, notes, why, futureNote, budgetChange, widthChangeFromWild }
  }

  function pushPast(snapshot){
    const copy = JSON.parse(JSON.stringify(snapshot))
    const past = (snapshot.past || []).slice(-20)
    copy.past = [...past, { ...snapshot, past: [] }]
    return copy
  }

  function undo(){
    if (!s.past || s.past.length === 0) return
    const prev = s.past[s.past.length - 1]
    setS({ ...prev, past: s.past.slice(0, -1) })
  }

  function nextTurn(choice){
    if (s.gameOver) return

    let working = pushPast(s)
    const baseCalc = computeThisDecade(choice, working)
    let { baseRate, rate, cost, notes } = baseCalc

    // persistent toggles & timers
    let reefBuilt = working.reefBuilt
    let reefRoundsLeft = working.reefRoundsLeft
    let seawallBuilt = working.seawallBuilt
    let retreatRoundsLeft = working.retreatRoundsLeft
    let baseBaseline = working.baseBaseline

    if (choice === 'REEF' && !reefBuilt){ reefBuilt = true; reefRoundsLeft = 3 }
    if (choice === 'SEAWALL' && !seawallBuilt){ seawallBuilt = true }
    if (choice === 'RETREAT'){ retreatRoundsLeft = 3 }

    let drawn = null
    let wildExtras = null
    if (choice === 'NONE'){
      drawn = drawWild()
      const applied = applyWild(drawn, working, baseCalc)
      rate = applied.rate
      cost += applied.cost
      notes = [...notes, ...applied.notes]
      wildExtras = applied
      if (drawn.key === 'EMISSIONS') baseBaseline = Math.max(baseBaseline, -5) // persist improvement
    }

    const budgetDelta = cost
    const newBudget = working.budget + cost
    const newWidth = Math.max(0, working.width + rate)

    // timers tick AFTER applying this decade
    if (reefRoundsLeft > 0) reefRoundsLeft -= 1
    if (retreatRoundsLeft > 0) retreatRoundsLeft -= 1

    const lines = []
    const label = OPTIONS[choice]?.title || 'Action'
    lines.push(`Year ${working.year}–${working.year+10}: ${label}.`)
    notes.forEach(n => lines.push(`• ${n}`))
    lines.push(`• Base rate: ${baseRate} ft; final change this decade: ${rate} ft`)
    lines.push(`• Budget: ${prettyMoney(working.budget)} → ${prettyMoney(newBudget)}`)
    lines.push(`• Width: ${working.width} ft → ${newWidth} ft`)

    const reachedEnd = working.round >= ROUNDS
    const lost = (newWidth <= 0) || (newBudget <= 0)
    const victory = !lost && reachedEnd
    const gameOver = lost || reachedEnd

    const nextState = {
      ...working,
      year: working.year + 10,
      round: working.round + 1,
      width: newWidth,
      budget: newBudget,
      baseBaseline,
      reefBuilt,
      reefRoundsLeft,
      seawallBuilt,
      retreatRoundsLeft,
      lastRate: rate,
      lastBaseRate: baseRate,
      log: [lines.join('\n'), ...working.log],
      gameOver,
      victory,
      history: [...working.history, {year:working.year+10, width:newWidth, budget:newBudget}],
    }
    setS(nextState)

    if (drawn && wildExtras){
      const widthChangeThisDecade = rate
      const widthFromWild = wildExtras.widthChangeFromWild || 0
      const budgetFromWild = wildExtras.budgetChange || 0
      setWildModal({
        key: drawn.key,
        name: drawn.name,
        text: drawn.text,
        imgs: WILDCARD_IMGS[drawn.key],
        widthChangeThisDecade,
        widthFromWild,
        budgetChangeThisDecade: budgetDelta,
        budgetFromWild,
        why: wildExtras.why,
        futureNote: wildExtras.futureNote,
        newWidth,
        newBudget,
        decadeRange: `${working.year}–${working.year+10}`,
      })
    } else {
      setWildModal(null)
    }
  }

  function resetGame(newDiff = difficulty){
    setS(initialState(newDiff))
    setSelected('NOURISH')
    setWildModal(null)
  }

  // Top-down beach visual: map 50 ft => 50% sand; clamp 0–100%
  const sandPct = Math.max(0, Math.min(100, (s.width/START_WIDTH)*50))

  const EndScreen = () => (
    <div className="modal-backdrop strong">
      <div className="modal">
        <h2 style={{marginTop:0}}>{s.victory ? 'You finished the plan! 🏖️' : 'Game over 😞'}</h2>
        <p>Final year: {s.year}. Width: {s.width} ft. Budget: {prettyMoney(s.budget)}.</p>
        <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:8}}>
          <button className="primary" onClick={()=>resetGame()}>Play again</button>
        </div>
      </div>
    </div>
  )

  const WildModal = () => {
    if (!wildModal) return null
    const { name, text, imgs, why, futureNote, widthChangeThisDecade, widthFromWild, budgetChangeThisDecade, budgetFromWild } = wildModal
    const bg = `linear-gradient(to top, rgba(0,0,0,.5), rgba(0,0,0,.15)), ${imgs.map(u=>`url('${u}')`).join(', ')}`
    return (
      <div className="modal-backdrop strong">
        <div className="wild-frame pop">
          <div className="wild-photo" style={{ backgroundImage: bg }} />
          <div className="wild-sheet">
            <div className="wild-title">{name}</div>
            <div className="wild-sub">{text}</div>

            <div className="impact-grid">
              <div className={'impact-tile ' + (widthChangeThisDecade >= 0 ? 'good' : 'bad')}>
                <div className="impact-label">Beach</div>
                <div className="impact-value">{widthChangeThisDecade >= 0 ? '+' : ''}{widthChangeThisDecade} ft</div>
              </div>
              <div className={'impact-tile ' + (budgetChangeThisDecade >= 0 ? 'good' : 'bad')}>
                <div className="impact-label">Budget</div>
                <div className="impact-value">{budgetChangeThisDecade >= 0 ? '+' : ''}{prettyMoney(budgetChangeThisDecade)}</div>
              </div>
            </div>

            <div className="wild-mini">
              Wild-card contribution → Beach {widthFromWild >= 0 ? '+' : ''}{widthFromWild} ft • Budget {budgetFromWild >= 0 ? '+' : ''}{prettyMoney(budgetFromWild)}
            </div>

            {(why || futureNote) && (
              <details className="why-details">
                <summary>Why this result?</summary>
                {why && <div className="why-text">{why}</div>}
                {futureNote && <div className="future-text">{futureNote}</div>}
              </details>
            )}

            <div className="wild-actions">
              <button className="primary" onClick={()=>setWildModal(null)}>Continue</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      {/* CENTERED, BIG TITLE + Help */}
      <div className="masthead">
        <div className="mast-title">Save the Beach!</div>
        <div className="mast-sub">Survive to {END_YEAR} without the beach or the budget hitting zero.</div>
        {badge}
        <button className="secondary help-btn" onClick={()=>setShowIntro(true)}>Help</button>
      </div>

      {/* Settings */}
      <div className="card" style={{marginBottom:16}}>
        <div className="header"><h3>Settings</h3></div>
        <div className="content" style={{display:'flex', gap:12, flexWrap:'wrap', alignItems:'center'}}>
          <div>
            <div style={{fontSize:12, color:'#64748b'}}>Difficulty</div>
            <div style={{display:'flex', gap:6}}>
              {Object.entries(DIFFICULTIES).map(([key, cfg])=>(
                <button key={key} className={key===difficulty ? 'primary' : 'btn'} onClick={()=>{ setDifficulty(key); resetGame(key) }}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginLeft:'auto'}}>
            <button className="secondary" onClick={undo} disabled={!s.past || s.past.length===0}>Undo decade</button>
            <button className="secondary" onClick={()=>resetGame()}>Reset</button>
          </div>
        </div>
      </div>

      <div className="grid">
        {/* STATUS */}
        <div className="card">
          <div className="header"><h3>Current Status</h3></div>
          <div className="content">
            <div className="stats">
              <Stat label="Year" value={`${s.year}`} />
              <Stat label="Beach Width" value={`${s.width} ft`} />
              <Stat label="Budget" value={prettyMoney(s.budget)} />
              <Stat label="Base (this turn)" value={`${currentBaseRate(s)} ft/dec`} />
              <Stat label="Reef left" value={`${s.reefRoundsLeft} rounds`} />
              <Stat label="Seawall?" value={s.seawallBuilt ? 'Yes' : 'No'} />
              <Stat label="Retreat left" value={`${s.retreatRoundsLeft} rounds`} />
              <Stat label="Round" value={`${s.round}/${ROUNDS}`} />
            </div>

            {/* TOP-DOWN COASTAL VISUAL */}
            <div className="coast">
              <div className="water"></div>
              <div className="sand" style={{width: sandPct + '%'}}></div>
              <div className="neighborhood"></div>
            </div>
          </div>
        </div>

        {/* ACTIONS — move cards use inline SVGs */}
        <div className="card">
          <div className="header"><h3>Choose Your Move</h3></div>
          <div className="content">
            <div className="option-grid">
              {ORDER.map(key => {
                const o = OPTIONS[key]
                const isSel = selected === key
                const src = MOVE_BG[key][0]
                return (
                  <div
                    key={key}
                    className={'option-card photo' + (isSel ? ' selected' : '')}
                    onClick={()=>!s.gameOver && setSelected(key)}
                  >
                    <div className="option-photo" style={{ backgroundImage: `url('${src}')` }} />
                    <div className="option-overlay" />
                    <div className="option-top">
                      <div className="option-title">{o.title}</div>
                      <div className="cost-pill">{o.cost > 0 ? `–$${o.cost}M` : '—'}</div>
                    </div>
                    <div className="option-meta">{o.desc}</div>
                  </div>
                )
              })}
            </div>
            <div className="actions">
              <button className="primary" disabled={s.gameOver} onClick={()=>nextTurn(selected)}>Advance Decade</button>
              <button className="secondary" onClick={()=>resetGame()}>Reset</button>
            </div>
          </div>
        </div>
      </div>

      {/* LOG */}
      <div className="card" style={{marginTop:16}}>
        <div className="header"><h3>Decade Log</h3></div>
        <div className="content"><div className="log">{s.log.map((e,i)=>(<div key={i} className="log-entry">{e}</div>))}</div></div>
      </div>

      {s.gameOver && <EndScreen/>}
      <WildModal/>

      {/* Intro (skippable) */}
      {showIntro && (
        <div className="modal-backdrop strong">
          <div className="intro-modal pop">
            <div className="intro-title">How to play</div>
            <ul className="intro-list">
              <li>Pick one move each decade.</li>
              <li>Beach width changes by the decade’s rate.</li>
              <li>If Beach ≤ 0 ft or Budget ≤ $0M → you lose.</li>
              <li>Make it to {END_YEAR} with both above zero → you win!</li>
            </ul>
            <div className="intro-actions">
              <label className="intro-check">
                <input type="checkbox" onChange={(e)=> localStorage.setItem(INTRO_KEY, e.target.checked ? '1' : '0')} />
                Don’t show again
              </label>
              <button className="primary" onClick={()=> setShowIntro(false)}>Start</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({label, value}){
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  )
}
