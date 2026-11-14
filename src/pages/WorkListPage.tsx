import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useCmms } from '../data/context'
import { nowPacific, stampUtc } from '../domain/dates'
import { isAssignedTo, isClosedStatus, isSafetyWork, priorityRank, workOrderOverdue } from '../domain/format'
import { usePageMeta } from '../Shell'
import { WorkOrderCard } from '../ui'

const FILTERS = ['active', 'open', 'in progress', 'waiting parts', 'complete', 'canceled', 'all'] as const

export function WorkListPage() {
  const { snapshot, settings } = useCmms()
  usePageMeta('Work orders')
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'active'
  const overdueOnly = params.get('due') === 'overdue'
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState('')
  const [mine, setMine] = useState(false)
  const tech = snapshot.technicians.find((row) => row.tech_id === settings.techId)

  const jobs = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const now = nowPacific()
    return snapshot.workOrders
      .filter((row) => {
        if (status === 'active' && isClosedStatus(row.status)) return false
        if (status !== 'active' && status !== 'all' && row.status !== status) return false
        if (overdueOnly && !workOrderOverdue(row, now)) return false
        if (priority && !row.priority.startsWith(priority)) return false
        if (mine && tech && !isAssignedTo(row.assigned_to, tech.name)) return false
        if (!needle) return true
        const asset = snapshot.assets.find((item) => item.asset_id === row.asset_id)
        const hay = [row.wo_id, row.title, row.problem, row.action_taken, row.assigned_to, asset?.name, row.asset_id]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(needle)
      })
      .sort((a, b) => {
        const aClosed = isClosedStatus(a.status) ? 1 : 0
        const bClosed = isClosedStatus(b.status) ? 1 : 0
        if (aClosed !== bClosed) return aClosed - bClosed
        const aSafety = isSafetyWork(a.type, a.priority) ? 0 : 1
        const bSafety = isSafetyWork(b.type, b.priority) ? 0 : 1
        if (aSafety !== bSafety) return aSafety - bSafety
        const byPriority = priorityRank(a.priority) - priorityRank(b.priority)
        if (byPriority) return byPriority
        return (a.due ? stampUtc(a.due) : Number.POSITIVE_INFINITY) - (b.due ? stampUtc(b.due) : Number.POSITIVE_INFINITY)
      })
  }, [snapshot, query, status, overdueOnly, priority, mine, tech])

  return (
    <>
      <div className="search">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search jobs or assets" aria-label="Search work orders" />
      </div>
      <div className="chip-row" role="group" aria-label="Status">
        <button
          type="button"
          className="chip"
          aria-pressed={overdueOnly}
          onClick={() => {
            const next = new URLSearchParams(params)
            if (overdueOnly) next.delete('due')
            else next.set('due', 'overdue')
            setParams(next)
          }}
        >
          Overdue
        </button>
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            className="chip"
            aria-pressed={status === value}
            onClick={() => {
              const next = new URLSearchParams(params)
              if (value === 'active') next.delete('status')
              else next.set('status', value)
              setParams(next)
            }}
          >
            {value === 'active' ? 'Active' : value === 'all' ? 'All' : value}
          </button>
        ))}
      </div>
      <div className="chip-row" style={{ marginTop: 8 }}>
        <button type="button" className="chip" aria-pressed={priority === ''} onClick={() => setPriority('')}>
          Any priority
        </button>
        {['1', '2', '3', '4'].map((value) => (
          <button key={value} type="button" className="chip" aria-pressed={priority === value} onClick={() => setPriority(value)}>
            Priority {value}
          </button>
        ))}
        {tech && (
          <button type="button" className="chip" aria-pressed={mine} onClick={() => setMine((value) => !value)}>
            Mine · {tech.name.split(' ')[0]}
          </button>
        )}
      </div>
      <div className="between" style={{ margin: '12px 0 8px' }}>
        <p className="muted">{jobs.length} jobs</p>
        <Link to="/work/new" className="btn btn-primary">
          <Plus size={18} /> New work order
        </Link>
      </div>
      <div className="stack">
        {jobs.map((workOrder) => (
          <WorkOrderCard
            key={workOrder.wo_id}
            workOrder={workOrder}
            now={nowPacific()}
            assetName={snapshot.assets.find((asset) => asset.asset_id === workOrder.asset_id)?.name ?? workOrder.asset_id}
          />
        ))}
        {jobs.length === 0 && <p className="card">No work orders match those filters.</p>}
      </div>
    </>
  )
}
