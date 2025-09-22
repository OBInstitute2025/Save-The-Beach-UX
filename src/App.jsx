import React, { useState } from 'react'
import './styles.css'

const START_YEAR = 2020
const END_YEAR = 2100
const ROUNDS = 8
const START_WIDTH = 50 // ft

// Difficulty presets (baseline loss & starting budget)
const DIFFICULTIES = {
  easy:   { label: 'Easy',   baseline: -8,  budget: 220 },
  normal: { label: 'Normal', baseline: -10, budget: 200 },
  hard:   { label: 'Hard',   baseline: -12, budget: 180 },
}

const OPTIONS = {
  NONE:     {key:'NONE',     title:'Do Nothing',           cost:0,   desc:'Draw a Wild Card (random event).'},
  NOURISH:  {key:'NOURISH',  title:'Beach Nourishment',    cost:15,  desc:'Reduce loss by 5 ft this decade.'},
  DUNES:    {key:'DUNES',    title:'Dune Restoration',     cost:5,   desc:'Reduce loss by 2 ft this decade.'},
  REEF:     {key:'REEF',     title:'Artificial Reef',      cost:100, desc:'Reduce base loss to –5 ft/dec for 30 years.'},
  SEAWALL:  {key:'SEAWALL',  title:'Seawall / Armoring',   cost:150, desc:'Set base loss to –20 ft/dec permanently.'},
  RETREAT:  {key:'RETREAT',  title:'Managed Retreat',      cost:150, desc:'0 ft loss for the next 3 decades.'},
}
const ORDER = ['NOURISH','DUNES','REEF','SEAWALL','RETREAT','NONE']

const WILDCARDS = [
  { key: 'STORM',     name: '100-Year Storm',     text: 'Immediate –20 ft this decade.' },
  { key: 'RECALL',    name: 'Recall',             text: 'Reverse last decade’s management benefit (money not refunded).' },
  { key: 'LA_NINA',   name: 'La Niña Year',       text: '0 ft erosion this decade (no loss).' },
  { key: 'KING_TIDE', name: 'King Tide Flooding', text: '–$30M budget immediately (width unchanged).' },
  { key: 'EMISSIONS', name: 'Emissions Reduction',text: 'Global shift: baseline improves to –5 ft/decade.' },
]

function prettyMoney(m){ return `$${m.toFixed(0)}M` }

// --- Icons (inline SVGs) ---
const IconNourish = () => (
  <svg viewBox="0 0 64 64" className="option-icon" aria-hidden="true">
    <path d="M6 42h52" fill="none" stroke="currentColor" strokeWidth="3"/>
    <path d="M10 38l10-6 14 10 8-4 12 6" fill="none" stroke="currentColor" strokeWidth="3"/>
    <path d="M21 28a6 6 0 0 0 12 0" fill="none" stroke="currentColor" strokeWidth="3"/>
  </svg>
)
const IconDunes = () => (
  <svg viewBox="0 0 64 64" className="option-icon" aria-hidden="true">
    <path d="M6 44c8-8 16-8 24 0s16 8 28-2" fill="none" stroke="currentColor" strokeWidth="3"/>
    <path d="M20 36l4-8m-2 8l4-8" stroke="currentColor" strokeWidth="3"/>
  </svg>
)
const IconReef = () => (
  <svg viewBox="0 0 64 64" className="option-icon" aria-hidden="true">
    <path d="M8 46h48" stroke="currentColor" strokeWidth="3"/>
    <path d="M18 46c0-10 8-8 8-18m6 18c0-8 8-6 8-14m6 14c0-6 6-4 6-10" fill="none" stroke="currentColor" strokeWidth="3"/>
    <circle cx="24" cy="26" r="2" fill="currentColor"/>
  </svg>
)
const IconSeawall = () => (
  <svg viewBox="0 0 64 64" className="option-icon" aria-hidden="true">
    <rect x="10" y="22" width="12" height="24" fill="currentColor"/>
    <rect x="24" y="18" width="12" height="28" fill="currentColor" opacity=".9"/>
    <rect x="38" y="14" width="12" height="32" fill="currentColor" opacity=".8"/>
    <path d="M2 56c8-4 12-4 20 0s16 4 24 0 16-4 16-4" fill="none" stroke="currentColor" strokeWidth="3" opacity=".6"/>
  </svg>
)
const IconRetreat = () => (
  <svg viewBox="0 0 64 64" className="option-icon" aria-hidden="true">
    <path d="M8 34l12-10 12 10v12H8z" fill="currentColor"/>
    <path d="M38 24l10 8-10 8" fill="none" stroke="currentColor" strokeWidth="3"/>
  </svg>
)
const IconNone = () => (
  <svg viewBox="0 0 64 64" className="option-icon" aria-hidden="true">
    <circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" strokeWidth="3"/>
    <path d="M20 20l24 24" stroke="currentColor" strokeWidth="3"/>
  </svg>
)
const ICONS = { NOURISH: IconNourish, DUNES: IconDunes, REEF: IconReef, SEAWALL: IconSeawall, RETREAT: IconRetreat, NONE: IconNone }

export default function App(){
  const [difficulty, setDifficulty] = useState('normal')
  const [selected, setSelected] = useState('NOURISH')

  function initialState(diffKey = difficulty){
    const diff = DIFFICULTIES[diffKey]
    return {
      year: START_YEAR,
      round: 1,
      width: START_WIDTH,
      budget: diff.budget,
      baseBaseline: diff.baseline, // –8/–10/–12; EMISSIONS can improve to –5
      reefBuilt: false,
      reefRoundsLeft: 0,    // 3 rounds when built
      seawallBuilt: false,
      retreatRoundsLeft: 0, // 3 rounds when chosen
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
          // immediate effect unless overridden
          if (state.retreatRoundsLeft === 0 && !state.seawallBuilt){
            rate = Math.max(baseRate, -5)
          }
        } else {
          notes.push(state.reefRoundsLeft > 0 ? 'Reef already active.' : 'Reef effect ended.')
          rate = baseRate
        }
        break
      }
      case 'SEAWALL':
        if (!state.seawallBuilt){
          cost -= OPTIONS.SEWALL?.cost || OPTIONS.SEAWALL.cost
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
    switch(card.key){
      case 'STORM':
        rate += -20; notes.push('100-Year Storm → additional –20 ft this decade.'); break
      case 'RECALL':
        if (state.lastRate !== null && state.lastBaseRate !== null){
          const improvement = state.lastRate - state.lastBaseRate // (-5) - (-10) = +5
          rate += -improvement
          notes.push('Recall → reversed last decade’s management benefit on width.')
        } else { notes.push('Recall had no effect (no prior management recorded).') }
        break
      case 'LA_NINA':
        rate = 0; notes.push('La Niña → 0 ft change this decade.'); break
      case 'KING_TIDE':
        cost += -30; notes.push('King Tide → –$30M budget immediately.'); break
      case 'EMISSIONS':
        notes.push('Emissions cut → baseline improves to –5 ft/decade from now on.'); break
    }
    return { rate, cost, notes }
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
    if (choice === 'NONE'){
      drawn = drawWild()
      const applied = applyWild(drawn, working, baseCalc)
      rate = applied.rate
      cost += applied.cost
      notes = [...notes, ...applied.notes]
      if (drawn.key === 'EMISSIONS') baseBaseline = Math.max(baseBaseline, -5)
    }

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

    // NEW win/lose logic: lose immediately if width <= 0 or budget <= 0
    const reachedEnd = working.round >= ROUNDS
    const lost = (newWidth <= 0) || (newBudget <= 0)
    const victory = !lost && reachedEnd
    const gameOver = lost || reachedEnd

    setS({
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
    })
  }

  function resetGame(newDiff = difficulty){
    setS(initialState(newDiff))
    setSelected('NOURISH')
  }

  // Top-down beach visual: map 50 ft => 50% sand; clamp 0–100%
  const sandPct = Math.max(0, Math.min(100, (s.width/START_WIDTH)*50))

  const EndScreen = () => (
    <div className="modal-backdrop">
      <div className="modal">
        <h2 style={{marginTop:0}}>{s.victory ? 'You finished the plan! 🏖️' : 'Game over 😞'}</h2>
        <p>Final year: {s.year}. Width: {s.width} ft. Budget: {prettyMoney(s.budget)}.</p>
        <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:8}}>
          <button className="primary" onClick={()=>resetGame()}>Play again</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="title">Save the Beach!</div>
          <div style={{color:'#475569', fontSize:12}}>
            Survive to {END_YEAR} without the beach or the budget hitting zero.
          </div>
        </div>
        {badge}
      </div>

      {/* Settings: Difficulty + Undo */}
      <div className="card" style={{marginBottom:16}}>
        <div className="header"><h3>Settings</h3></div>
        <div className="content" style={{display:'flex', gap:12, flexWrap:'wrap', alignItems:'center'}}>
          <div>
            <div style={{fontSize:12, color:'#64748b'}}>Difficulty</div>
            <div style={{display:'flex', gap:6}}>
              {Object.entries(DIFFICULTIES).map(([key, cfg])=>(
                <button
                  key={key}
                  className={key===difficulty ? 'primary' : 'btn'}
                  onClick={()=>{ setDifficulty(key); resetGame(key) }}>
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

            {/* TOP-DOWN COASTAL VISUAL (taller now) */}
            <div className="coast">
              <div className="water"></div>
              <div className="sand" style={{width: sandPct + '%'}}></div>
              <div className="neighborhood"></div>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="card">
          <div className="header"><h3>Choose Your Move</h3></div>
          <div className="content">
            <div className="option-grid">
              {ORDER.map(key => {
                const o = OPTIONS[key]
                const Icon = ICONS[key]
                const isSel = selected === key
                return (
                  <div key={key} className={'option-card' + (isSel ? ' selected' : '')}
                       onClick={()=>!s.gameOver && setSelected(key)}>
                    <div className="option-top">
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <Icon />
                        <div className="option-title">{o.title}</div>
                      </div>
                      <div className="option-meta">{o.cost > 0 ? `–$${o.cost}M` : '—'}</div>
                    </div>
                    <div className="option-meta">{o.desc}</div>
                    {key === 'NOURISH' && s.retreatRoundsLeft > 0 && (
                      <div className="option-meta">During retreat: <b>+5 ft</b> this decade.</div>
                    )}
                    {key === 'DUNES' && s.retreatRoundsLeft > 0 && (
                      <div className="option-meta">During retreat: <b>+2 ft</b> this decade.</div>
                    )}
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
        <div className="content">
          <div className="log">
            {s.log.map((entry,i)=>(<div key={i} className="log-entry">{entry}</div>))}
          </div>
        </div>
      </div>

      {s.gameOver && <EndScreen/>}
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
