import { Link } from 'react-router-dom'
import { useCmms } from '../data/context'
import { dateOnlyUtc, stampUtc } from '../domain/dates'
import { frequencyLabel, pmOverdue, trimNum } from '../domain/format'
import { usePageMeta } from '../Shell'

export function PmPage() {
  usePageMeta('PM schedules')
  const { snapshot, today } = useCmms()
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
        {rows.map((pm) => {
          const asset = snapshot.assets.find((row) => row.asset_id === pm.asset_id)
          const overdue = pmOverdue(pm, today)
          const latest = snapshot.meterReadings
            .filter((row) => row.asset_id === pm.asset_id && row.unit === pm.unit)
            .sort((a, b) => (b.timestamp ? stampUtc(b.timestamp) : 0) - (a.timestamp ? stampUtc(a.timestamp) : 0))[0]
          return (
            <article key={pm.pm_id} className="card" style={overdue ? { background: '#fff8f7' } : undefined}>
              <div className="between wrap">
                <span className="mono">{pm.pm_id}</span>
                {overdue && <span className="chip pri pri-1">Overdue</span>}
              </div>
              <h2>{pm.task}</h2>
              <p>
                <Link to={`/a/${pm.asset_id}`}>{asset?.name ?? pm.asset_id}</Link>
              </p>
              <p className="muted">
                {frequencyLabel(pm)}
                {pm.est_hours != null ? ` · ${trimNum(pm.est_hours)} hr` : ''}
              </p>
              <p className="muted">
                Last done {pm.last_done ?? '—'}
                {pm.next_due ? ` · Next due ${pm.next_due}` : ' · Due by meter'}
              </p>
              {pm.frequency_type === 'meter' && latest && (
                <p className="muted">
                  Latest {latest.unit}: {latest.reading == null ? '—' : trimNum(latest.reading)} on {latest.timestamp}
                </p>
              )}
            </article>
          )
        })}
      </div>
    </>
  )
}
