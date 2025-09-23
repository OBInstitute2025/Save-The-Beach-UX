import React, { useState } from 'react'
import './styles.css'

/* =========================
   Game constants
   ========================= */
const START_YEAR = 2020
const END_YEAR = 2100
const ROUNDS = 8               // 8 decades → 80 years
const START_WIDTH = 50         // ft at start (used for visual scaling)

const DIFFICULTIES = {
  easy:   { label: 'Easy',   baseline: -8,  budget: 220 },
  normal: { label: 'Normal', baseline: -10, budget: 200 },
  hard:   { label: 'Hard',   baseline: -12, budget: 180 },
}

/* =========================
   Actions (moves) & costs
   ========================= */
const OPTIONS = {
  NOURISH: { key:'NOURISH', title:'Beach Nourishment',  cost:15,  desc:"Beach shrinks 5 feet less than normal this decade" },
  DUNES:   { key:'DUNES',   title:'Dune Restoration',   cost:5,   desc:"Beach shrinks 2 feet less than normal this decade" },
  REEF:    { key:'REEF',    title:'Artificial Reef',    cost:100, desc:"Beach shrinks by only 5 feet/decade for 30 years" },
  SEAWALL: { key:'SEAWALL', title:'Seawall / Armoring', cost:150, desc:"Beach shrinks by 20 feet per decade permanently" },
  RETREAT: { key:'RETREAT', title:'Managed Retreat',    cost:150, desc:"Beach doesn't shrink for 3 decades" },
  NONE:    { key:'NONE',    title:'Do Nothing (Wild Card)', cost:0, desc:'Draw a Wild Card (random event).' },
}
const ORDER = ['NOURISH','DUNES','REEF','SEAWALL','RETREAT','NONE']

/* =========================
   Local images (served from /public/images)
   ========================= */
function paths(name){
  return [
    `/images/${name}.webp`,  `images/${name}.webp`,
    `/images/${name}.jpg`,   `images/${name}.jpg`,
    `/images/${name}.jpeg`,  `images/${name}.jpeg`,
    `/images/${name}.png`,   `images/${name}.png`,
    `/images/${name}.JPG`,   `images/${name}.JPG`,
    `/images/${name}.PNG`,   `images/${name}.PNG`,
  ]
}
const MOVE_IMG = {
  NOURISH: paths('move-nourishment'),
  DUNES:   paths('move-dunes'),
  REEF:    paths('move-reef'),
  SEAWALL: paths('move-seawall'),
  RETREAT: paths('move-retreat'),
  NONE:    paths('move-none'),
}
const WILDCARD_IMGS = {
  STORM:     paths('wild-storm'),
  RECALL:    paths('wild-recall'),
  LA_NINA:   paths('wild-lanina'),   // no tilde in filename
  KING_TIDE: paths('wild-kingtide'),
  EMISSIONS: paths('wild-emissions'),
}

/* =========================
   Wild cards
   ========================= */
const WILDCARDS = [
  { key: 'STORM',     name: '100-Year Storm',     text: 'A powerful storm slams the coast.' },
  { key: 'RECALL',    name: 'Recall',             text: 'Your policy decision is overturned.' },
  { key: 'LA_NINA',   name: 'La Niña Year',       text: 'Unusually calm ocean conditions this year.' },
  { key: 'KING_TIDE', name: 'King Tide Flooding', text: 'Extreme high tides flood streets and infrastructure.' },
  { key: 'EMISSIONS', name: 'Emissions Reduction',text: 'Global shift lowers long-term sea-level rise rate.' },
]

/* =========================
   Hover tooltips for moves
   ========================= */
const TOOLTIPS = {
  NOURISH: "Beach Nourishment\nPump and place sand with pipes/barges.\nOne-decade effect. Cost: $15M.",
  DUNES: "Dune Restoration\nFencing + native plants trap wind-blown sand.\nOne-decade effect. Cost: $5M.",
  REEF: "Artificial Reef\nUnderwater blocks slow waves for ~30 years.\nCost: $100M.",
  SEAWALL: "Seawall / Armoring\nHard barrier protects buildings but can narrow the beach.\nPermanent effect: –20 ft/decade.",
  RETREAT: "Managed Retreat\nMove things back from the water.\nNo shrink for 3 decades. Cost: $150M.",
  NONE: "Do Nothing\nSkip a project this decade and draw a Wild Card.",
}

/* =========================
   Helpers
   ========================= */
function prettyMoney(m){ return `$${m.toFixed(0)}M` }

/** <img> that fails over through srcs[] (webp → jpg → png → …) */
function ImageFallback({srcs, className, alt=""}) {
  const [i, setI] = useState(0)
  const src = srcs[Math.min(i, srcs.length-1)]
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      onError={() => setI(v => (v < srcs.length-1 ? v+1 : v))}
      loading="lazy"
      decoding="async"
    />
  )
}

export default function App(){
  const [difficulty, setDifficulty] = useState('normal')
  const [selected, setSelected] = useState('NOURISH')
  const [wildModal, setWildModal] = useState(null)
  const INTRO_KEY = 'stb_hide_intro_v2'
  const [showIntro, setShowIntro] = useState(() => {
    try { return localStorage.getItem(INTRO_KEY) === '1' ? false : true } catch { return true }
  })

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

  const badge = s.gameOver
    ? (s.victory ? <span className="badge green">You saved the beach! 🏖️</span> : <span className="badge red">Game Over</span>)
    : <span className="badge blue">Round {s.round}/{ROUNDS}</span>

  // Current base rate priority:
  // Retreat (0) > Seawall (–20) > Reef active (max(base, –5)) > Baseline
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
        notes.push('Beach Nourishment: reduced beach loss by 5 ft this decade.')
        break
      case 'DUNES':
        cost -= OPTIONS.DUNES.cost
        rate = baseRate + 2
        notes.push('Dune Restoration: reduced beach loss by 2 ft this decade.')
        break
      case 'REEF':
        if (!state.reefBuilt){
          cost -= OPTIONS.REEF.cost
          notes.push('Built Artificial Reef: base beach loss becomes –5 ft/dec for 30 years.')
          if (state.retreatRoundsLeft === 0 && !state.seawallBuilt){
            rate = Math.max(baseRate, -5) // immediate effect this decade
          }
        } else {
          notes.push(state.reefRoundsLeft > 0 ? 'Reef already active.' : 'Reef effect ended.')
          rate = baseRate
        }
        break
      case 'SEAWALL':
        if (!state.seawallBuilt){
          cost -= OPTIONS.SEAWALL.cost
          notes.push('Built Seawall: base beach loss becomes –20 ft/dec permanently.')
        } else {
          notes.push('Seawall already built.')
        }
        rate = baseRate
        break
      case 'RETREAT':
        cost -= OPTIONS.RETREAT.cost
        notes.push('Managed Retreat: beach loss is 0 for this and the next 2 decades.')
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
        why = 'Strong waves and a high storm surge pull sand off the beach quickly—like a big bite taken out at once.'
        notes.push('100-Year Storm → additional –20 ft this decade.')
        break
      case 'RECALL':
        if (state.lastRate !== null && state.lastBaseRate !== null){
          const improvement = state.lastRate - state.lastBaseRate // e.g. (-5) - (-10) = +5
          widthChangeFromWild = -improvement
          rate += -improvement
          why = 'Leaders changed their minds, so last decade’s plan was undone and you lose that extra protection.'
          notes.push('Recall → reversed last decade’s management benefit on width.')
        } else {
          why = 'There wasn’t a plan last decade, so there’s nothing to undo this time.'
          notes.push('Recall had no effect (no prior management recorded).')
        }
        break
      case 'LA_NINA':
        widthChangeFromWild = -rate // cancels whatever the rate was
        rate = 0
        why = 'La Niña shifts winds and storms over the Pacific. Here we assume gentler waves for a while, so little or no erosion this decade.'
        notes.push('La Niña → 0 ft change this decade.')
        break
      case 'KING_TIDE':
        budgetChange = -30
        cost += -30
        why = '“King tides” are very high high tides caused by how the Sun, Moon, and Earth line up. They can flood streets and cause costly cleanups.'
        notes.push('King Tide → –$30M budget immediately.')
        break
      case 'EMISSIONS': {
        const before = rate
        rate = Math.max(rate, -5)      // immediate improvement this decade
        widthChangeFromWild = rate - before
        why = 'Cutting greenhouse gas emissions slows long-term sea-level rise. We cap the baseline erosion at −5 ft/decade from now on.'
        futureNote = 'Baseline set to −5 ft/decade from now on.'
        notes.push('Emissions cut → baseline improves to −5 ft/decade immediately and going forward.')
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

  // Preload images on hover
  function preload(srcs){ const i = new Image(); i.src = srcs[0]; }

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

    if (choice === 'REEF' && !reefBuilt){ reefBuilt = true; reefRoundsLeft = 3 }      // 30 years
    if (choice === 'SEAWALL' && !seawallBuilt){ seawallBuilt = true }                 // permanent
    if (choice === 'RETREAT'){ retreatRoundsLeft = 3 }                                // 3 decades

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
    lines.push(`• Rate of beach loss (base): ${baseRate} ft/dec; final change this decade: ${rate} ft`)
    lines.push(`• Budget: ${prettyMoney(working.budget)} → ${prettyMoney(newBudget)}`)
    lines.push(`• Beach width: ${working.width} ft → ${newWidth} ft`)

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
      setWildModal({
        key: drawn.key,
        name: drawn.name,
        text: drawn.text,
        imgs: WILDCARD_IMGS[drawn.key],
        widthChangeThisDecade: rate,
        widthFromWild: wildExtras.widthChangeFromWild || 0,
        budgetChangeThisDecade: budgetDelta,
        budgetFromWild: wildExtras.budgetChange || 0,
        why: wildExtras.why,
        futureNote: wildExtras.futureNote,
        newWidth: newWidth,
        newBudget: newBudget,
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

  const EndScreen = () => (
    <div className="modal-backdrop strong">
      <div className="modal">
        <h2 style={{marginTop:0}}>{s.victory ? 'You saved the beach! 🏖️' : 'Game over 😞'}</h2>
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
    return (
      <div className="modal-backdrop strong">
        <div className="wild-frame pop">
          <ImageFallback className="wild-photo-img" srcs={imgs} alt={name} />
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
      {/* Title / badge / help */}
      <div className="masthead">
        <div className="mast-title">Save the Beach!</div>
        <div className="mast-sub">Survive to year {END_YEAR} without the beach or the budget hitting zero.</div>
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
              <Stat label="Rate of beach loss" value={`${currentBaseRate(s)} ft/dec`} />
            </div>

            {/* TOP-DOWN COASTAL VISUAL */}
            <div className="coast">
              <div className="water"></div>
              <div className="sand" style={{width: Math.max(0, Math.min(100, (s.width/START_WIDTH)*50)) + '%'}}>
                <div className="shoreline" aria-hidden="true"></div>
                <div className="wetband" aria-hidden="true"></div>
              </div>
              <div className="neighborhood"></div>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="card">
          <div className="header"><h3>Choose Your Move</h3></div>
          <div className="content">
            {/* Force stacked layout even if old CSS lingers */}
            <div className="option-grid" style={{display:'grid', gridTemplateColumns:'1fr'}}>
              {ORDER.map(key => {
                const o = OPTIONS[key]
                const isSel = selected === key
                return (
                  <div key={key} className="tip-wrap" data-tip={TOOLTIPS[key]} onMouseEnter={() => { const i=new Image(); i.src=MOVE_IMG[key][0] }}>
                    <div
                      className={'option-card photo' + (isSel ? ' selected' : '')}
                      tabIndex={0}
                      onKeyDown={(e)=> (e.key === 'Enter' || e.key === ' ') && !s.gameOver && setSelected(key)}
                      onClick={()=>!s.gameOver && setSelected(key)}
                    >
                      <ImageFallback className="option-photo-img" srcs={MOVE_IMG[key]} alt={o.title} />
                      <div className="option-overlay" />
                      <div className="option-top">
                        <div className="option-title">{o.title}</div>
                        <div className="cost-pill">{o.cost > 0 ? `–$${o.cost}M` : '—'}</div>
                      </div>
                      <div className="option-meta">{o.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="actions">
              <button className="primary cta-pulse" disabled={s.gameOver} onClick={()=>nextTurn(selected)}>Make your move</button>
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
      {wildModal && <WildModal/>}

      {/* Intro (skippable) */}
      {showIntro && (
        <div className="modal-backdrop strong">
          <div className="intro-modal pop">
            <div className="intro-title">How to play</div>
            <ul className="intro-list">
              <li>Pick one move each decade.</li>
              <li>The beach shrinks by 10 feet per decade, unless you make a move!</li>
              <li>If Beach ≤ 0 ft or Budget ≤ $0M → you lose.</li>
              <li>Make it to year {END_YEAR} with both above zero → you win!</li>
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

/* Small stat block */
function Stat({label, value}){
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  )
}
