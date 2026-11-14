import { Link } from 'react-router-dom'
import { QrCode, TriangleExclamationPoint } from 'lucide-react'
import { useCmms } from '../data/context'
import { isClosedStatus, isLowStock, isSafetyWork, pmOverdue } from '../domain/format'
import { nowPacific, stampUtc } from '../domain/dates'
import { usePageMeta } from '../Shell'
import { WorkOrderCard } from '../ui'

export function HomePage() {
  const { snapshot, settings, today, updateSettings } = useCmms()
  usePageMeta('Today')
  const tech = snapshot.technicians.find((row) => row.tech_id === settings.techId)
  const firstName = tech?.name.split(' ')[0] ?? 'there'
  const now = nowPacific()
  const active = snapshot.workOrders.filter((row) => !isClosedStatus(row.status))
  const safety = active.filter((row) => isSafetyWork(row.type, row.priority))
  const counts = {
    open: active.filter((row) => row.status === 'open').length,
    progress: active.filter((row) => row.status === 'in progress').length,
    waiting: active.filter((row) => row.status === 'waiting parts').length,
    overdue: snapshot.pmSchedules.filter((row) => pmOverdue(row, today)).length,
  }
  const jobs = [...active].sort((a, b) => {
    const aSafety = isSafetyWork(a.type, a.priority) ? 0 : 1
    const bSafety = isSafetyWork(b.type, b.priority) ? 0 : 1
    if (aSafety !== bSafety) return aSafety - bSafety
    return (a.due ? stampUtc(a.due) : Number.POSITIVE_INFINITY) - (b.due ? stampUtc(b.due) : Number.POSITIVE_INFINITY)
  })
  const lowParts = snapshot.parts.filter(isLowStock).length
  const hasExample = snapshot.assets.some((row) => row.data_flag === 'EXAMPLE')

  return (
    <>
      {safety.length > 0 && (
        <section className="safety-banner" role="alert">
          <TriangleExclamationPoint />
          <div>
            <strong>Safety hold</strong>
            <p>
              {safety.length === 1 ? 'One emergency or safety job is still open.' : `${safety.length} emergency or safety jobs are still open.`}{' '}
              Do not start the line until {safety.length === 1 ? 'it is' : 'they are'} cleared.
            </p>
            <Link to={`/w/${safety[0].wo_id}`}>Open {safety[0].wo_id}</Link>
          </div>
        </section>
      )}
      {hasExample && !settings.hideExampleNote && (
        <section className="example-banner">
          <div>
            <strong>Example data</strong>
            <p>This phone is showing the sample filler, compressor, and jobs. Load your own Excel file in Settings when you are ready.</p>
          </div>
          <button className="banner-dismiss" type="button" onClick={() => void updateSettings({ hideExampleNote: true })}>
            Hide
          </button>
        </section>
      )}
      <p className="muted">Hello, {firstName}</p>
      <h2 style={{ margin: '0 0 12px', color: 'var(--navy)' }}>Suisun City · bottling and cellar</h2>
      <Link to="/scan" className="scan-hero">
        <span className="scan-hero-icon">
          <QrCode size={28} />
        </span>
        <span>
          <strong>Scan QR</strong>
          <small>Open the asset or job on a label</small>
        </span>
      </Link>
      <div className="stat-grid">
        <Link className="stat" to="/work?status=open">
          <strong>{counts.open}</strong>
          <span>Open</span>
        </Link>
        <Link className="stat" to="/work?status=in%20progress">
          <strong>{counts.progress}</strong>
          <span>In progress</span>
        </Link>
        <Link className="stat" to="/work?status=waiting%20parts">
          <strong>{counts.waiting}</strong>
          <span>Waiting parts</span>
        </Link>
        <Link className="stat" to="/pm">
          <strong>{counts.overdue}</strong>
          <span>PM overdue</span>
        </Link>
      </div>
      <h3 className="section-title">Open jobs</h3>
      <div className="stack">
        {jobs.slice(0, 6).map((workOrder) => (
          <WorkOrderCard
            key={workOrder.wo_id}
            workOrder={workOrder}
            now={now}
            assetName={snapshot.assets.find((asset) => asset.asset_id === workOrder.asset_id)?.name ?? workOrder.asset_id}
          />
        ))}
        {jobs.length === 0 && <p className="card">No open jobs.</p>}
      </div>
      {lowParts > 0 && (
        <p className="muted" style={{ marginTop: 16 }}>
          {lowParts} part{lowParts === 1 ? '' : 's'} at or below the reorder point. <Link to="/parts">See parts</Link>
        </p>
      )}
    </>
  )
}
