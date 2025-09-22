import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import './styles.css'

const START_YEAR = 2020
const END_YEAR = 2100
const ROUNDS = 8
const START_WIDTH = 50 // ft
const GOAL_WIDTH = 10 // win threshold
const START_BUDGET = 200 // $M
const BASELINE_EROSION = -10 // ft/decade

const OPTIONS = {
  NONE: {key:'NONE', title:'Do Nothing', cost:'—', effect:'Draw a Wild Card', desc:'Skip a management action and draw a random event.'},
  NOURISH: {key:'NOURISH', title:'Beach Nourishment', cost:'–$15M', effect:'≤ –5 ft this decade', desc:'Adds sand; slows loss this round.'},
  DUNES: {key:'DUNES', title:'Dune Restoration', cost:'–$5M', effect:'≤ –5 ft this decade', desc:'Plant/stabilize dunes; slows loss.'},
  SEAWALL: {key:'SEAWALL', title:'Seawall / Armoring', cost:'–$150M build; –$10M/dec maint', effect:'–20 ft/decade ongoing', desc:'Protects backshore; accelerates beach loss.'},
  REEF: {key:'REEF', title:'Artificial Reef', cost:'–$100M build', effect:'≤ –5 ft; +$10M/dec revenue', desc:'Offshore reef reduces energy and draws surfers.'},
  RETREAT: {key:'RETREAT', title:'Managed Retreat', cost:'–$175M one-time', effect:'0 ft/dec; –$10M/dec revenue', desc:'Relocate infrastructure and let beach migrate.'},
}
const ORDER = ['NOURISH','DUNES','REEF','SEAWALL','RETREAT','NONE']

const WILDCARDS = [
  { key: 'STORM', name: '100-Year Storm', text: 'Immediate –20 ft beach this decade. Baseline rate unchanged.' },
  { key: 'RECALL', name: 'Recall', text: 'Reverse last decade’s management effect on width (money not refunded).' },
  { key: 'LA_NINA', name: 'La Niña Year', text: '0 ft erosion this decade (no loss).' },
  { key: 'KING_TIDE', name: 'King Tide Flooding', text: 'Lose $30M from budget immediately (width unchanged).' },
  { key: 'EMISSIONS', name: 'Emissions Reduction', text: 'Global shift: baseline erosion becomes –5 ft/decade permanently.' },
]

function prettyMoney(m){ return `$${m.toFixed(0)}M` }

export default function App(){
  const [s, setS] = useState({
    year: START_YEAR,
    round: 1,
    width: START_WIDTH,
    budget: START_BUDGET,
    baseline: BASELINE_EROSION,
    seawallBuilt: false,
    reefCount: 0,
    retreatActive: false,
    lastDecadeErosionRate: null,
    log: [`Game start: ${START_YEAR}. Beach=${START_WIDTH} ft, Budget=${prettyMoney(START_BUDGET)}. Baseline erosion –10 ft/decade.`],
    gameOver: false,
    victory: false,
    history: [{year:START_YEAR, width:START_WIDTH, budget:START_BUDGET}],
  })
  const [selected, setSelected] = useState('NOURISH')
  const [revealedWild, setRevealedWild] = useState(null)
  const [flipWild, setFlipWild] = useState(false)

  const statusBadge = s.gameOver
    ? (s.victory ? <span className="badge green">Victory 🎉</span> : <span className="badge red">Game Over</span>)
    : <span className="badge blue">Round {s.round} / {ROUNDS}</span>

  function computeErosion(choice, state){
    let cost = 0, revenue = 0
    let notes = []
    let rate = state.baseline

    if (state.retreatActive){
      rate = 0
      revenue -= 10
      notes.push('Managed Retreat active: erosion 0 ft/dec; –$10M revenue.')
    }
    if (state.seawallBuilt){
      rate = -20
      cost -= 10 // maintenance
      notes.push('Seawall maintenance –$10M; erosion –20 ft/dec.')
    }

    switch (choice){
      case 'NOURISH':
        cost -= 15
        rate = Math.min(rate, -5)
        notes.push('Beach Nourishment this decade: –$15M; erosion ≤ –5 ft.')
        break
      case 'DUNES':
        cost -= 5
        rate = Math.min(rate, -5)
        notes.push('Dune Restoration this decade: –$5M; erosion ≤ –5 ft.')
        break
      case 'SEAWALL':
        if (!state.seawallBuilt){
          cost -= 150
          notes.push('Built Seawall –$150M. From now: erosion –20 ft/dec; –$10M/dec maint.')
        }
        break
      case 'REEF':
        cost -= 100
        rate = Math.min(rate, -5)
        notes.push('Built Artificial Reef –$100M. Erosion ≤ –5 ft; +$10M/dec revenue.')
        break
      case 'RETREAT':
        if (!state.retreatActive){
          cost -= 175
          notes.push('Managed Retreat –$175M. From now: erosion 0 ft/dec; –$10M/dec revenue.')
        }
        rate = 0
        break
      default:
        notes.push('Chose to do nothing → draw a Wild Card.')
    }

    const futureReefCount = state.reefCount + (choice === 'REEF' ? 1 : 0)
    if (futureReefCount > 0){
      revenue += 10 * futureReefCount
      notes.push(`Reef tourism +$${10 * futureReefCount}M/decade.`)
    }

    return { rate, cost, revenue, notes }
  }

  function drawWild(){ return WILDCARDS[Math.floor(Math.random()*WILDCARDS.length)] }

  function applyWild(card, state, base){
    let { rate, cost, revenue } = base
    let widthDelta = rate
    const notes = [`Wild Card: ${card.name}.`]

    switch(card.key){
      case 'STORM':
        widthDelta += -20
        notes.push('100-Year Storm → additional –20 ft this decade.')
        break
      case 'RECALL': {
        const last = state.lastDecadeErosionRate
        if (last !== null){
          const improvement = last - state.baseline   // e.g., -5 - (-10) = +5
          widthDelta += -improvement                  // apply extra loss (e.g., -5)
          notes.push('Recall → reversed last decade’s management effect on width (money not refunded).')
        } else {
          notes.push('Recall had no effect (no prior management recorded).')
        }
        break
      }
      case 'LA_NINA':
        widthDelta = 0
        notes.push('La Niña → 0 ft loss this decade.')
        break
      case 'KING_TIDE':
        cost += -30
        notes.push('King Tide Flooding → –$30M budget immediately.')
        break
      case 'EMISSIONS':
        if (state.baseline < -5) notes.push('Global Emissions Reduction → baseline improves to –5 ft/decade.')
        break
    }
    return { rate, cost, revenue, widthDelta, notes }
  }

  function nextTurn(choice){
    if (s.gameOver) return
    const base = computeErosion(choice, s)

    let seawallBuilt = s.seawallBuilt || choice === 'SEAWALL'
    let reefCount = s.reefCount + (choice === 'REEF' ? 1 : 0)
    let retreatActive = s.retreatActive || choice === 'RETREAT'
    let baseline = s.baseline

    let widthDelta = base.rate
    let cost = base.cost
    let revenue = base.revenue
    let notes = [...base.notes]
    let wild = null

    if (choice === 'NONE'){
      wild = drawWild()
      const applied = applyWild(wild, s, base)
      widthDelta = applied.widthDelta
      cost += applied.cost
      revenue += applied.revenue
      notes = [...notes, ...applied.notes]
      if (wild.key === 'EMISSIONS') baseline = Math.max(baseline, -5)
    }

    const newBudget = s.budget + cost + revenue
    const newWidth = Math.max(0, s.width + widthDelta)

    const lines = []
    lines.push(`Year ${s.year}–${s.year+10}: chose ${OPTIONS[choice]?.title || 'Action'}.`)
    notes.forEach(n => lines.push(`• ${n}`))
    lines.push(`• Erosion this decade: ${widthDelta} ft`)
    lines.push(`• Budget change: ${prettyMoney(cost + revenue)} → ${prettyMoney(newBudget)}`)
    lines.push(`• Beach width: ${s.width} ft → ${newWidth} ft`)

    const reachedEnd = s.round >= ROUNDS
    const victory = reachedEnd && newWidth >= GOAL_WIDTH && newBudget > 0
    const gameOver = newWidth <= 0 || newBudget <= 0 || reachedEnd

    setS({
      ...s,
      year: s.year + 10,
      round: s.round + 1,
      width: newWidth,
      budget: newBudget,
      baseline,
      seawallBuilt,
      reefCount,
      retreatActive,
      lastDecadeErosionRate: base.rate,
      log: [lines.join('\n'), ...s.log],
      gameOver,
      victory,
      history: [...s.history, {year:s.year+10, width:newWidth, budget:newBudget}],
    })
    setRevealedWild(wild)
    setFlipWild(choice === 'NONE')
  }

  function resetGame(){
    setS({
      year: START_YEAR,
      round: 1,
      width: START_WIDTH,
      budget: START_BUDGET,
      baseline: BASELINE_EROSION,
      seawallBuilt: false,
      reefCount: 0,
      retreatActive: false,
      lastDecadeErosionRate: null,
      log: [`Game start: ${START_YEAR}. Beach=${START_WIDTH} ft, Budget=${prettyMoney(START_BUDGET)}. Baseline erosion –10 ft/decade.`],
      gameOver: false,
      victory: false,
      history: [{year:START_YEAR, width:START_WIDTH, budget:START_BUDGET}],
    })
    setSelected('NOURISH')
    setRevealedWild(null)
    setFlipWild(false)
  }

  // summary deltas
  const last = s.history[s.history.length-1] || {width:START_WIDTH, budget:START_BUDGET}
  const prev = s.history.length>1 ? s.history[s.history.length-2] : last
  const widthDelta = last.width - prev.width
  const budgetDelta = last.budget - prev.budget

  const pctWidth = Math.max(0, Math.min(100, (s.width/START_WIDTH)*100))
  const goalLeftPct = (GOAL_WIDTH / START_WIDTH) * 100

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="title">Save the Beach!</div>
          <div style={{color:'#475569', fontSize:12}}>Start {START_WIDTH} ft • Budget ${START_BUDGET}M • Baseline –10 ft/dec • Goal: reach {END_YEAR} with ≥ {GOAL_WIDTH} ft and money left</div>
        </div>
        {statusBadge}
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
              <Stat label="Baseline" value={`${s.baseline} ft/dec`} />
              <Stat label="Reefs" value={`${s.reefCount}`} />
              <Stat label="Seawall?" value={s.seawallBuilt ? 'Yes' : 'No'} />
              <Stat label="Retreat?" value={s.retreatActive ? 'Active' : 'No'} />
              <Stat label="Round" value={`${s.round}/${ROUNDS}`} />
            </div>

            {/* shoreline meter */}
            <div className="beach-meter">
              <div className="beach-fill" style={{width:`${pctWidth}%`}}></div>
              <div className="beach-label">{s.width} ft</div>
              <div className="beach-goal" style={{ left: `${goalLeftPct}%` }} title="Win threshold"></div>
            </div>

            {/* timeline */}
            <div className="timeline">
              {Array.from({length: ROUNDS}).map((_,i)=>{
                const done = i < s.round-1
                const active = i === s.round-1 && !s.gameOver
                return <span key={i} className={`dot ${done ? 'done' : active ? 'active' : ''}`}></span>
              })}
            </div>

            {/* wild card */}
            {revealedWild && (
              <div className="wild-wrap">
                <div className={`wild-card ${flipWild ? 'flip' : ''}`}>
                  <div className="wild-front">Wild Card…</div>
                  <div className="wild-back"><b>{revealedWild.name}</b><br/>{revealedWild.text}</div>
                </div>
              </div>
            )}

            {/* round summary delta */}
            {s.history.length > 1 && (
              <div className="summary">
                <span>Round summary:</span>
                <span>Width: <span className={`delta ${widthDelta>=0?'pos':'neg'}`}>{widthDelta>=0?'+':''}{widthDelta} ft</span></span>
                <span>Budget: <span className={`delta ${budgetDelta>=0?'pos':'neg'}`}>{budgetDelta>=0?'+':''}{prettyMoney(budgetDelta)}</span></span>
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
                const selectedClass = key === selected ? 'selected' : ''
                return (
                  <div key={key} className={`option-card ${selectedClass}`} onClick={()=>!s.gameOver && setSelected(key)}>
                    <div className="option-top">
                      <div className="option-title">{o.title}</div>
                      <div className="option-meta">{o.cost}</div>
                    </div>
                    <div className="option-meta">{o.effect}</div>
                    <div style={{fontSize:12, color:'#64748b'}}>{o.desc}</div>
                  </div>
                )
              })}
            </div>
            <div className="actions">
              <button className="primary" disabled={s.gameOver} onClick={()=>nextTurn(selected)}>Advance Decade</button>
              <button className="secondary" onClick={resetGame}>Reset</button>
            </div>
            <div style={{fontSize:12, color:'#64748b', marginTop:8}}>
              • Reef revenue: +$10M per decade per reef. Seawall maintenance: –$10M/decade. Retreat: –$10M/decade revenue, 0 ft erosion.
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
        <span>Win by reaching {END_YEAR} with ≥ {GOAL_WIDTH} ft of beach and budget &gt; 0.</span>
        <span>Mix options: nature-based, hard engineering, or risk a wild card.</span>
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
