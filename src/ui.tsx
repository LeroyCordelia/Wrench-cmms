import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Asset, WorkOrder } from './domain/types'
import { duePhrase, isSafetyWork, priorityLabel, priorityRank } from './domain/format'

export function StatusChip({ status }: { status: string }) {
  return <span className={`chip status status-${status.replace(/\s+/g, '-')}`}>{status}</span>
}

export function PriorityChip({ priority }: { priority: string }) {
  return (
    <span className={`chip pri pri-${priorityRank(priority)}`} title={priority}>
      {priorityLabel(priority)}
    </span>
  )
}

export function CriticalityBadge({ value }: { value: string }) {
  return <span className={`crit crit-${value.toLowerCase()}`}>{value}</span>
}

export function AssetCard({ asset, location }: { asset: Asset; location: string }) {
  const stripe = asset.criticality === 'A' ? 1 : asset.criticality === 'B' ? 2 : 4
  return (
    <Link to={`/a/${asset.asset_id}`} className={`card card-link stripe-${stripe}`}>
      <div className="between">
        <CriticalityBadge value={asset.criticality} />
        <StatusChip status={asset.status} />
      </div>
      <h2>{asset.name}</h2>
      <p className="meta">
        <span className="mono">{asset.asset_id}</span>
        <span>{asset.category}</span>
      </p>
      <p className="muted">{location}</p>
    </Link>
  )
}

export function WorkOrderCard({
  workOrder,
  assetName,
  now,
}: {
  workOrder: WorkOrder
  assetName: string
  now: string
}) {
  const due = duePhrase(workOrder.due, now)
  const safety = isSafetyWork(workOrder.type, workOrder.priority)
  return (
    <Link
      to={`/w/${workOrder.wo_id}`}
      className={`card card-link stripe-${priorityRank(workOrder.priority)} ${safety ? 'card-safety' : ''}`}
    >
      <div className="between">
        <span className="mono">{workOrder.wo_id}</span>
        <span className="row">
          {safety && <span className="chip pri pri-1">Safety</span>}
          <PriorityChip priority={workOrder.priority} />
        </span>
      </div>
      <h2 className="clamp">{workOrder.problem}</h2>
      <p className="muted">{assetName}</p>
      <div className="between wrap">
        <StatusChip status={workOrder.status} />
        <span className={due.overdue && workOrder.status !== 'complete' && workOrder.status !== 'canceled' ? 'overdue' : 'muted'}>
          {due.text}
          {workOrder.assigned_to ? ` · ${workOrder.assigned_to}` : ''}
        </span>
      </div>
    </Link>
  )
}

export function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`field ${className ?? ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function MissingRecord({ title, body }: { title: string; body: string }) {
  return (
    <section className="card empty">
      <h2>{title}</h2>
      <p>{body}</p>
      <Link to="/" className="btn btn-primary">
        Back to today
      </Link>
    </section>
  )
}

export function parseOptionalNumber(raw: string, label: string): number | null {
  const text = raw.trim()
  if (!text) return null
  const value = Number(text)
  if (!Number.isFinite(value)) throw new Error(`${label} needs to be a number.`)
  return value
}
