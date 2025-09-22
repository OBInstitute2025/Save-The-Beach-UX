import React, { useState } from 'react'
import './styles.css'

const START_YEAR = 2020
const END_YEAR = 2100
const ROUNDS = 8
const START_WIDTH = 50 // ft
const GOAL_WIDTH = 10
const START_BUDGET = 200 // $M
const BASELINE = -10 // ft/decade (no action)

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
  { key: 'RECALL',    name: 'Recall',             text: 'Reverse last decade’s management effect on width (money not refunded).' },
  { key: 'LA_NINA',   name: 'La Niña Year',       text: '0 ft erosion this decade (no loss).' },
  { key: 'KING_TIDE', name: 'King Tide Flooding', text: '–$30M budget immediately (width unchanged).' },
  { key: 'EMISSIONS', name: 'Emissions Reduction',text: 'Global shift: baseline improves to –5 ft/decade.' },
]

function prettyMoney(m){ return `$${m.toFixed(0)}M` }

export default function App(){
  const [s, setS] = useState({
    year: START_YEAR,
    round: 1,
    width: START_WIDTH,
    budget: START_BUDGET,
    baseBaseline: BASELINE,    // –10 normally; EMISSIONS can improve to –5
    reefBuilt: false,
    reefRoundsLeft: 0,         // 3 rounds (30 yrs) after building
    seawallBuilt: false,
    retreatRoundsLeft: 0,      // 3 rounds (30 yrs) after choosing
    lastRate: null,            // last decade’s final delta
    lastBaseRate: null,        // last decade’s base before per-decade action
    log: [`Start ${START_YEAR}: Beach=${START_WIDTH} ft, Budget=${prettyMoney(START_BUDGET)}, Baseline ${BASELINE} ft/dec.`],
    gameOver: false,
    victory: false,
    history: [{year:START_YEAR, width:START_WIDTH, budget:START_BUDGET}],
  })
  const [selected, setSelected] = useState('NOURISH')
  const [wild, setWild] = useState(null)

  // Priority: Retreat (0) > Seawall (-20) > Reef active (max(base,-5)) > Baseline
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
          // Apply its benefit immediately unless overridden by Retreat/Seawall
          if (state.retreatRoundsLeft === 0 && !state.seawallBuilt){
            rate = Math.max(baseRate, -5)
          }
        } else {
          notes.push(state.reefRoundsLeft > 0 ? 'Reef already active (no extra cost).' : 'Reef effect ended (no extra cost).')
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

  function drawWild(){ return WILDCARDS[Math.floor(Math.random()*WILDCARDS.length)] }

  function applyWild(card, state, baseCalc){
    let { rate, cost } = baseCalc
    const notes = [`Wild Card: ${card.name}.`]
    switch(card.key){
      case 'STORM':
        rate += -20
        notes.push('100-Year Storm → additional –20 ft this decade.')
        break
      case 'RECALL':
        if (state.lastRate !== null && state.lastBaseRate !== null){
          const improvement = state.lastRate - state.lastBaseRate // e.g., (-5) - (-10) = +5
          rate += -improvement
          notes.push('Recall → reversed last decade’s management benefit on width.')
        } else {
          notes.push('Recall had no effect (no prior management recorded).')
        }
        break
      case 'LA_NINA':
        rate = 0
        notes.push('La Niña → 0 ft change this decade.')
        break
      case 'KING_TIDE':
        cost += -30
        notes.push('King Tide → –$30M budget immediately.')
        break
      case 'EMISSIONS':
        notes.push('Emissions cut → baseline improves to –5 ft/decade from now on.')
        break
    }
    return { rate, cost, notes }
  }

  function nextTurn(choice){
    if (s.gameOver) return

    const baseCalc = computeThisDecade(choice, s)
    let { baseRate, rate, cost, notes } = baseCalc

    // persistent toggles & timers
    let reefBuilt = s.reefBuilt
    let reefRoundsLeft = s.reefRoundsLeft
    let seawallBuilt = s.seawallBuilt
    let retreatRoundsLeft = s.retreatRoundsLeft
    let baseBaseline = s.baseBaseline

    if (choice === 'REEF' && !reefBuilt){
      reefBuilt = true
      reefRoundsLeft = 3 // 30 years including THIS decade
    }
    if (choice === 'SEAWALL' && !seawallBuilt){
      seawallBuilt = true
    }
    if (choice === 'RETREAT'){
      retreatRoundsLeft = 3 // includes this decade
    }

    // wild card if doing nothing
    let drawn = null
    if (choice === 'NONE'){
      drawn = drawWild()
      const applied = applyWild(drawn, s, baseCalc)
      rate = applied.rate
      cost += applied.cost
      notes = [...notes, ...applied.notes]
      if (drawn.key === 'EMISSIONS') baseBaseline = Math.max(baseBaseline, -5)
    }

    // Apply width/budget
    const newBudget = s.budget + cost
    const newWidth = Math.max(0, s.width + rate)

    // Timers tick AFTER applying this decade
    if (reefRoundsLeft > 0) reefRoundsLeft -= 1
    if (retreatRoundsLeft > 0) retreatRoundsLeft -= 1

    const lines = []
    const label = OPTIONS[choice]?.title || 'Action'
    lines.push(`Year ${s.year}–${s.year+10}: ${label}.`)
    notes.forEach(n => lines.push(`• ${n}`))
    lines.push(`• Base rate: ${baseRate} ft; final change this decade: ${rate} ft`)
    lines.push(`• Budget: ${prettyMoney(s.budget)} → ${prettyMoney(newBudget)}`)
    lines.push(`• Width: ${s.width} ft → ${newWidth} ft`)

    const reachedEnd = s.round >= ROUNDS
    const victory = reachedEnd && newWidth >= GOAL_WIDTH && newBudget > 0
    const gameOver = (newWidth <= 0) || (newBudget <= 0) || reachedEnd

    setS({
      ...s,
      year: s.year + 10,
      round: s.round + 1,
      width: newWidth,
      budget: newBudget,
      baseBaseline,
      reefBuilt,
      reefRoundsLeft,
      seawallBuilt,
      retreatRoundsLeft,
      lastRate: rate,
      lastBaseRate: baseRate,
      log: [lines.join('\n'), ...s.log],
      gameOver,
      victory,
      history: [...s.history, {year:s.year+10, width:newWidth, budget:newBudget}],
    })
    setWild(drawn)
  }

  function resetGame(){
    setS({
      year: START_YEAR,
      round: 1,
      width: START_WIDTH,
      budget: START_BUDGET,
      baseBaseline: BASELINE,
      reefBuilt: false,
      reefRoundsLeft: 0,
      seawallBuilt: false,
      retreatRoundsLeft: 0,
      lastRate: null,
      lastBaseRate: null,
      log: [`Start ${START_YEAR}: Beach=${START_WIDTH} ft, Budget=${prettyMoney(START_BUDGET)}, Baseline ${BASELINE} ft/dec.`],
      gameOver: false,
      victory: false,
      history: [{year:START_YEAR, width:START_WIDTH, budget:START_BUDGET}],
    })
    setSelected('NOURISH')
    setWild(null)
  }

  // Top-down beach visual: map 50 ft => 50% sand; clamp 0–100%
  const sandPct = Math.max(0, Math.min(100, (s.width/START_WIDTH)*50))

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="title">Save the Beach!</div>
          <div style={{color:'#475569', fontSize:12}}>
            Start {START_WIDTH} ft • Budget ${START_BUDGET}M • Baseline –10 ft/dec • Goal: reach {END_YEAR} with ≥ {GOAL_WIDTH} ft
          </div>
        </div>
        {s.gameOver
          ? (s.victory ? <span className="badge green">Victory 🎉</span> : <span className="badge red">Game Over</span>)
          : <span className="badge blue">Round {s.round}/{ROUNDS}</span>}
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

            {/* Wild Card message */}
            {wild && (
              <div style={{marginTop:10, fontSize:14, color:'#334155'}}>
                <b>Wild Card:</b> {wild.name} — {wild.text}
              </div>
            )}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="card">
          <div className="header"><h3>Choose Your Move</h3></div>
          <div className="content">
            <div className="option-grid">
              {ORDER.map(key => {
                const o = OPTIONS[key]
                const isSelected = selected === key
                return (
                  <div key={key} className={'option-card' + (isSelected ? ' selected' : '')}
                       onClick={()=>!s.gameOver && setSelected(key)}>
                    <div className="option-top">
                      <div className="option-title">{o.title}</div>
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
              <button className="secondary" onClick={resetGame}>Reset</button>
            </div>
            <div style={{fontSize:12, color:'#64748b', marginTop:8}}>
              • One-time costs for Reef/Seawall/Retreat; per-use costs for Nourishment/Dunes. No ongoing revenues/costs.
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

      <div className="footer-hints">
        <span>Tip: Reef gives –5 ft/dec for 3 rounds; Nourish/Dunes add +5/+2 that decade. Retreat sets base to 0 for 3 rounds.</span>
        <span>Win by {END_YEAR} with ≥ {GOAL_WIDTH} ft and money left.</span>
      </div>
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
