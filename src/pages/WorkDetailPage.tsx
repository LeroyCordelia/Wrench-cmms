import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Checklist } from '../Checklist'
import { useCmms } from '../data/context'
import { workOrderUrl } from '../domain/qr'
import { nowPacific } from '../domain/dates'
import { duePhrase, formatUsd, isSafetyWork, roundMoney, workOrderTitle } from '../domain/format'
import type { WoPartInput, WoTask, WorkOrder } from '../domain/types'
import { usePageMeta } from '../Shell'
import { Field, MissingRecord, PriorityChip, StatusChip, parseOptionalNumber } from '../ui'

export function WorkDetailPage() {
  const params = useParams()
  const raw = params.id ?? ''
  const id = raw.toUpperCase()
  if (raw && raw !== id) return <Navigate to={`/w/${id}`} replace />
  return <WorkGate id={id} />
}

function WorkGate({ id }: { id: string }) {
  const { snapshot } = useCmms()
  const workOrder = snapshot.workOrders.find((row) => row.wo_id === id)
  usePageMeta(workOrder ? workOrder.wo_id : 'Work order', '/work')
  if (!workOrder) {
    return (
      <MissingRecord
        title={`${id} was not found`}
        body="No work order with that ID is stored on this phone. The label may be from a workbook that has not been loaded yet."
      />
    )
  }
  return <WorkEditor key={workOrder.wo_id} workOrder={workOrder} />
}

interface LineDraft {
  part_id: string
  qty: string
  cost: string
  notes: string
  data_flag: string
}

function WorkEditor({ workOrder }: { workOrder: WorkOrder }) {
  const { snapshot, settings, saveWorkOrder, saveWoTasks } = useCmms()
  const asset = snapshot.assets.find((row) => row.asset_id === workOrder.asset_id)
  const [action, setAction] = useState(workOrder.action_taken ?? '')
  const [labor, setLabor] = useState(workOrder.labor_hours == null ? '' : String(workOrder.labor_hours))
  const [downtime, setDowntime] = useState(workOrder.downtime_minutes == null ? '' : String(workOrder.downtime_minutes))
  const [lines, setLines] = useState<LineDraft[]>(
    snapshot.woParts
      .filter((row) => row.wo_id === workOrder.wo_id)
      .map((row) => ({
        part_id: row.part_id,
        qty: row.qty == null ? '' : String(row.qty),
        cost: row.cost == null ? '' : String(row.cost),
        notes: row.notes ?? '',
        data_flag: row.data_flag,
      })),
  )
  const [tasks, setTasks] = useState<WoTask[]>(() =>
    (snapshot.woTasks ?? []).filter((task) => task.wo_id === workOrder.wo_id),
  )
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const safety = isSafetyWork(workOrder.type, workOrder.priority)
  const due = duePhrase(workOrder.due, nowPacific())
  const url = workOrderUrl(settings.baseUrl, workOrder.wo_id)

  function updateLine(index: number, patch: Partial<LineDraft>, reprice = false) {
    setLines((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) return line
        const next = { ...line, ...patch }
        if (reprice) {
          const part = snapshot.parts.find((row) => row.part_id === next.part_id)
          const qty = Number(next.qty || '1')
          if (part?.unit_cost_usd != null && Number.isFinite(qty)) next.cost = String(roundMoney(part.unit_cost_usd * qty))
          if (!next.qty) next.qty = '1'
        }
        return next
      }),
    )
  }

  async function persist(status: string) {
    setError(null)
    setSaved(null)
    if (status === 'complete' && safety) {
      const ok = window.confirm('Confirm the line is safe to run before completing this safety job.')
      if (!ok) return
    }
    setBusy(true)
    try {
      const partLines: WoPartInput[] = lines
        .filter((line) => line.part_id)
        .map((line) => ({
          part_id: line.part_id,
          qty: parseOptionalNumber(line.qty, 'Quantity'),
          cost: parseOptionalNumber(line.cost, 'Cost'),
          notes: line.notes,
          data_flag: line.data_flag || workOrder.data_flag,
        }))
      await saveWorkOrder(
        {
          ...workOrder,
          status,
          action_taken: action,
          labor_hours: parseOptionalNumber(labor, 'Labor hours'),
          downtime_minutes: parseOptionalNumber(downtime, 'Downtime'),
        },
        partLines,
      )
      setSaved('Saved on this phone.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the work order.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {safety && (
        <section className="safety-banner" role="alert">
          <div>
            <strong>Safety job</strong>
            <p>Keep this loud in the backlog. Do not start the affected equipment until the job is closed.</p>
          </div>
        </section>
      )}
      <article className={`card hero-card ${safety ? 'card-safety' : ''}`}>
        <div>
          <div className="row wrap">
            <StatusChip status={workOrder.status} />
            <PriorityChip priority={workOrder.priority} />
            <span className="chip">{workOrder.type}</span>
          </div>
          <h2>{workOrderTitle(workOrder)}</h2>
          <p className="mono">{workOrder.wo_id}</p>
          {asset ? (
            <p>
              <Link to={`/a/${asset.asset_id}`}>{asset.name}</Link>
            </p>
          ) : (
            <p className="muted">{workOrder.asset_id}</p>
          )}
          <p className={due.overdue && workOrder.status !== 'complete' ? 'overdue' : 'muted'}>{due.text}</p>
          <p className="muted">{workOrder.assigned_to ? `Assigned to ${workOrder.assigned_to}` : 'Unassigned'}</p>
          {workOrder.requested_by && <p className="muted">Requested by {workOrder.requested_by}</p>}
        </div>
        <div className="qr-wrap">
          <QRCodeSVG value={url} size={88} />
        </div>
      </article>
      <h3 className="section-title">Problem</h3>
      <p className="card prose">{workOrder.problem || 'No problem text yet.'}</p>
      <h3 className="section-title">Checklist</h3>
      <Checklist
        steps={tasks}
        editable
        onResponse={(index, response) => {
          const next = tasks.map((task, taskIndex) => (taskIndex === index ? { ...task, response } : task))
          setTasks(next)
          void saveWoTasks(workOrder.wo_id, next)
        }}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void persist(workOrder.status)
        }}
      >
        <h3 className="section-title">Action taken</h3>
        <Field label="What you did">
          <textarea value={action} onChange={(event) => setAction(event.target.value)} placeholder="Write it the way you would tell the next shift." />
        </Field>
        <div className="form-grid two" style={{ marginTop: 12 }}>
          <Field label="Labor hours">
            <input inputMode="decimal" value={labor} onChange={(event) => setLabor(event.target.value)} />
          </Field>
          <Field label="Downtime (minutes)">
            <input inputMode="decimal" value={downtime} onChange={(event) => setDowntime(event.target.value)} />
          </Field>
        </div>
        <h3 className="section-title">Parts used</h3>
        {lines.map((line, index) => {
          const part = snapshot.parts.find((row) => row.part_id === line.part_id)
          return (
            <div key={`${line.part_id}-${index}`} className="card" style={{ marginTop: 8 }}>
              <Field label="Part">
                <select value={line.part_id} onChange={(event) => updateLine(index, { part_id: event.target.value }, true)}>
                  <option value="">Choose a part</option>
                  {snapshot.parts.map((row) => (
                    <option key={row.part_id} value={row.part_id}>
                      {row.part_id} · {row.description} ({row.qty_on_hand ?? 0} on hand)
                    </option>
                  ))}
                </select>
              </Field>
              <div className="form-grid two" style={{ marginTop: 8 }}>
                <Field label="Qty">
                  <input inputMode="decimal" value={line.qty} onChange={(event) => updateLine(index, { qty: event.target.value }, true)} />
                </Field>
                <Field label="Cost (USD)">
                  <input inputMode="decimal" value={line.cost} onChange={(event) => updateLine(index, { cost: event.target.value })} />
                </Field>
              </div>
              <p className="muted">{part ? formatUsd(part.unit_cost_usd) + ' each' : ''}</p>
              <button
                type="button"
                className="btn btn-text"
                onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}
              >
                Remove part
              </button>
            </div>
          )
        })}
        <button
          type="button"
          className="btn btn-ghost btn-block"
          style={{ marginTop: 8 }}
          onClick={() => setLines((current) => [...current, { part_id: '', qty: '1', cost: '', notes: '', data_flag: 'REAL' }])}
        >
          Add a part
        </button>
        {error && <p className="form-error" style={{ marginTop: 12 }}>{error}</p>}
        {saved && <p className="saved-note">{saved}</p>}
        <div className="actions">
          <button className="btn btn-ghost" type="submit" disabled={busy}>
            Save notes
          </button>
          {workOrder.status === 'open' && (
            <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void persist('in progress')}>
              Start work
            </button>
          )}
          {workOrder.status === 'in progress' && (
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => void persist('waiting parts')}>
              Waiting on parts
            </button>
          )}
          {workOrder.status === 'waiting parts' && (
            <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void persist('in progress')}>
              Resume work
            </button>
          )}
          {workOrder.status !== 'complete' && workOrder.status !== 'canceled' && (
            <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void persist('complete')}>
              Complete job
            </button>
          )}
          {workOrder.status !== 'complete' && workOrder.status !== 'canceled' && (
            <button className="btn btn-danger" type="button" disabled={busy} onClick={() => void persist('canceled')}>
              Cancel job
            </button>
          )}
          {(workOrder.status === 'complete' || workOrder.status === 'canceled') && (
            <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void persist('open')}>
              Reopen
            </button>
          )}
          <Link className="btn btn-ghost" to={`/work/${workOrder.wo_id}/edit`}>
            Edit details
          </Link>
        </div>
      </form>
      {workOrder.limble_history && (
        <details className="card" style={{ marginTop: 12 }}>
          <summary>Earlier history</summary>
          <p className="prose">{workOrder.limble_history}</p>
        </details>
      )}
      <p className="muted">
        Opened {workOrder.created ?? '—'}
        {workOrder.completed ? ` · Completed ${workOrder.completed}` : ''}
        {workOrder.pm_id ? ` · From ${workOrder.pm_id}` : ''}
      </p>
    </>
  )
}
