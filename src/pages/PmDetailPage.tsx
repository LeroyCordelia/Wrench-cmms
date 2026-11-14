import { Link, useParams } from 'react-router-dom'
import { Checklist } from '../Checklist'
import { useCmms } from '../data/context'
import { frequencyLabel, locationLabel, pmOverdue } from '../domain/format'
import { usePageMeta } from '../Shell'
import { MissingRecord } from '../ui'

export function PmDetailPage() {
  const { id = '' } = useParams()
  const pmId = id.toUpperCase()
  const { snapshot, today } = useCmms()
  const pm = snapshot.pmSchedules.find((row) => row.pm_id === pmId)
  usePageMeta(pm ? pm.pm_id : 'PM', '/pm')
  if (!pm) {
    return <MissingRecord title={`${pmId} was not found`} body="That PM schedule is not on this phone." />
  }
  const asset = snapshot.assets.find((row) => row.asset_id === pm.asset_id)
  const steps = (snapshot.pmTasks ?? []).filter((task) => task.pm_id === pm.pm_id)
  const overdue = pmOverdue(pm, today)
  return (
    <>
      <article className={`card ${overdue ? 'card-overdue' : ''}`}>
        <div className="between wrap">
          <span className="mono">{pm.pm_id}</span>
          {overdue && <span className="chip pri pri-1">Overdue</span>}
        </div>
        <h2>{pm.task}</h2>
        {asset ? (
          <p>
            <Link to={`/a/${asset.asset_id}`}>{asset.name}</Link>
            <span className="muted"> · {locationLabel(snapshot.locations, asset.location_id)}</span>
          </p>
        ) : (
          <p className="muted">{pm.asset_id || 'No asset'}</p>
        )}
        <p className="muted">{frequencyLabel(pm)}{pm.schedule_anchor ? ` · ${pm.schedule_anchor}` : ''}</p>
        <p className="muted">
          Last done {pm.last_done ?? '—'}
          {pm.next_due ? ` · Next due ${pm.next_due}` : ''}
          {pm.assigned_to ? ` · ${pm.assigned_to}` : ''}
        </p>
        {pm.description && <p className="prose">{pm.description}</p>}
        {pm.schedule_rule && <p className="muted">{pm.schedule_rule}</p>}
        {pm.notes && <p className="muted">{pm.notes}</p>}
      </article>
      <h3 className="section-title">Checklist</h3>
      <Checklist steps={steps} editable={false} />
    </>
  )
}
