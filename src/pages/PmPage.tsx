import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCmms } from '../data/context'
import { dateOnlyUtc } from '../domain/dates'
import { frequencyLabel, pmOverdue } from '../domain/format'
import { usePageMeta } from '../Shell'

export function PmPage() {
  usePageMeta('PM schedules')
  const { snapshot, today } = useCmms()
  const [shown, setShown] = useState(40)
  const assetName = useMemo(() => new Map(snapshot.assets.map((asset) => [asset.asset_id, asset.name])), [snapshot.assets])
  const rows = [...snapshot.pmSchedules].sort((a, b) => {
    const aOver = pmOverdue(a, today) ? 0 : 1
    const bOver = pmOverdue(b, today) ? 0 : 1
    if (aOver !== bOver) return aOver - bOver
    if (a.next_due && b.next_due) return dateOnlyUtc(a.next_due) - dateOnlyUtc(b.next_due)
    if (a.next_due) return -1
    if (b.next_due) return 1
    return a.pm_id.localeCompare(b.pm_id)
  })

  return (
    <>
      <p className="muted">Read only for now. Generating the next work order from a due PM comes in a later update.</p>
      <div className="stack" style={{ marginTop: 12 }}>
        {rows.slice(0, shown).map((pm) => {
          const overdue = pmOverdue(pm, today)
          return (
            <Link key={pm.pm_id} to={`/pm/${pm.pm_id}`} className={`card card-link ${overdue ? 'card-overdue' : ''}`}>
              <div className="between wrap">
                <span className="mono">{pm.pm_id}</span>
                {overdue && <span className="chip pri pri-1">Overdue</span>}
              </div>
              <h2>{pm.task}</h2>
              <p className="muted">
                {assetName.get(pm.asset_id) ?? (pm.asset_id || 'No asset')} · {frequencyLabel(pm)}
                {pm.next_due ? ` · ${pm.next_due}` : ''}
                {pm.assigned_to ? ` · ${pm.assigned_to}` : ''}
              </p>
            </Link>
          )
        })}
        {shown < rows.length && (
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setShown((count) => count + 80)}>
            Show more ({rows.length - shown} left)
          </button>
        )}
      </div>
    </>
  )
}
