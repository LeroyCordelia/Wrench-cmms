import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useCmms } from '../data/context'
import { fromDatetimeInput, toDatetimeInput } from '../domain/dates'
import { formatId } from '../domain/ids'
import { listValues, withCurrentOption } from '../domain/format'
import type { WorkOrder } from '../domain/types'
import { usePageMeta } from '../Shell'
import { Field, MissingRecord } from '../ui'

export function WorkFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { snapshot, settings } = useCmms()
  const workOrder = id ? snapshot.workOrders.find((row) => row.wo_id === id.toUpperCase()) : undefined
  usePageMeta(workOrder ? `Edit ${workOrder.wo_id}` : 'New work order', workOrder ? `/w/${workOrder.wo_id}` : '/work')
  if (id && !workOrder) {
    return <MissingRecord title="Work order not found" body="That job is not on this phone, so it cannot be edited." />
  }
  const presetAsset = params.get('asset')?.toUpperCase() ?? ''
  return <WorkForm workOrder={workOrder} presetAsset={presetAsset} techName={snapshot.technicians.find((row) => row.tech_id === settings.techId)?.name ?? ''} />
}

function WorkForm({
  workOrder,
  presetAsset,
  techName,
}: {
  workOrder?: WorkOrder
  presetAsset: string
  techName: string
}) {
  const { snapshot, saveWorkOrder } = useCmms()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [assetId, setAssetId] = useState(workOrder?.asset_id ?? (snapshot.assets.some((row) => row.asset_id === presetAsset) ? presetAsset : snapshot.assets[0]?.asset_id ?? ''))
  const [type, setType] = useState(workOrder?.type ?? 'corrective')
  const [priority, setPriority] = useState(workOrder?.priority ?? '3 — Normal')
  const [status, setStatus] = useState(workOrder?.status ?? 'open')
  const [requestedBy, setRequestedBy] = useState(workOrder?.requested_by ?? techName)
  const [assignedTo, setAssignedTo] = useState(workOrder?.assigned_to ?? techName)
  const [due, setDue] = useState(toDatetimeInput(workOrder?.due ?? null))
  const [title, setTitle] = useState(workOrder?.title ?? '')
  const [problem, setProblem] = useState(workOrder?.problem ?? '')
  const [action, setAction] = useState(workOrder?.action_taken ?? '')
  const [labor, setLabor] = useState(workOrder?.labor_hours == null ? '' : String(workOrder.labor_hours))
  const [downtime, setDowntime] = useState(workOrder?.downtime_minutes == null ? '' : String(workOrder.downtime_minutes))
  const [pmId, setPmId] = useState(workOrder?.pm_id ?? '')
  const [notes, setNotes] = useState(workOrder?.notes ?? '')
  const [dataFlag, setDataFlag] = useState(workOrder?.data_flag ?? 'REAL')
  const nextId = formatId('workOrder', snapshot.highWater.workOrder + 1)
  const types = withCurrentOption(listValues(snapshot.lists.headers, snapshot.lists.rows, 'wo_type'), type)
  const priorities = withCurrentOption(listValues(snapshot.lists.headers, snapshot.lists.rows, 'priority'), priority)
  const statuses = withCurrentOption(listValues(snapshot.lists.headers, snapshot.lists.rows, 'wo_status'), status)
  const flags = withCurrentOption(listValues(snapshot.lists.headers, snapshot.lists.rows, 'data_flag'), dataFlag)
  const pms = snapshot.pmSchedules.filter((row) => row.asset_id === assetId)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const laborHours = labor.trim() === '' ? null : Number(labor)
      const downtimeMinutes = downtime.trim() === '' ? null : Number(downtime)
      if (laborHours != null && !Number.isFinite(laborHours)) throw new Error('Labor hours needs to be a number.')
      if (downtimeMinutes != null && !Number.isFinite(downtimeMinutes)) throw new Error('Downtime needs to be a number.')
      const existingLines = workOrder
        ? snapshot.woParts
            .filter((row) => row.wo_id === workOrder.wo_id)
            .map((row) => ({
              part_id: row.part_id,
              qty: row.qty,
              cost: row.cost,
              notes: row.notes,
              data_flag: row.data_flag,
            }))
        : []
      const saved = await saveWorkOrder(
        {
          wo_id: workOrder?.wo_id ?? '',
          asset_id: assetId,
          type,
          priority,
          status,
          requested_by: requestedBy,
          assigned_to: assignedTo,
          created: workOrder?.created ?? null,
          due: fromDatetimeInput(due),
          completed: workOrder?.completed ?? null,
          title,
          problem,
          action_taken: action,
          labor_hours: laborHours,
          downtime_minutes: downtimeMinutes,
          pm_id: pmId || null,
          notes,
          data_flag: dataFlag,
        },
        existingLines,
      )
      navigate(`/w/${saved.wo_id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the work order.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="form-grid two">
      {error && <p className="form-error span-2">{error}</p>}
      <p className="muted span-2">
        {workOrder ? (
          <>
            ID <span className="mono">{workOrder.wo_id}</span> does not change.
          </>
        ) : (
          <>
            The next ID will be <span className="mono">{nextId}</span>.
          </>
        )}
      </p>
      <Field label="Asset" className="span-2">
        <select value={assetId} onChange={(event) => setAssetId(event.target.value)}>
          <option value="">No asset</option>
          {snapshot.assets.map((asset) => (
            <option key={asset.asset_id} value={asset.asset_id}>
              {asset.asset_id} · {asset.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Type">
        <select value={type} onChange={(event) => setType(event.target.value)}>
          {types.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
      <Field label="Priority">
        <select value={priority} onChange={(event) => setPriority(event.target.value)}>
          {priorities.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
      <Field label="Status">
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          {statuses.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
      <Field label="Due">
        <input type="datetime-local" value={due} onChange={(event) => setDue(event.target.value)} />
      </Field>
      <Field label="Requested by">
        <input value={requestedBy} onChange={(event) => setRequestedBy(event.target.value)} />
      </Field>
      <Field label="Assigned to (names or a team, separated by commas)">
        <input list="tech-names" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} />
        <datalist id="tech-names">
          {snapshot.technicians.filter((row) => row.active !== 'no').map((row) => (
            <option key={row.tech_id} value={row.name} />
          ))}
        </datalist>
      </Field>
      <Field label="Title" className="span-2">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Short name, such as Glycol valve" />
      </Field>
      <Field label="Problem" className="span-2">
        <textarea value={problem} onChange={(event) => setProblem(event.target.value)} />
      </Field>
      <Field label="Action taken" className="span-2">
        <textarea value={action} onChange={(event) => setAction(event.target.value)} />
      </Field>
      <Field label="Labor hours">
        <input inputMode="decimal" value={labor} onChange={(event) => setLabor(event.target.value)} />
      </Field>
      <Field label="Downtime (minutes)">
        <input inputMode="decimal" value={downtime} onChange={(event) => setDowntime(event.target.value)} />
      </Field>
      <Field label="PM schedule">
        <select value={pmId} onChange={(event) => setPmId(event.target.value)}>
          <option value="">None</option>
          {pms.map((pm) => (
            <option key={pm.pm_id} value={pm.pm_id}>
              {pm.pm_id} · {pm.task.slice(0, 60)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Data flag">
        <select value={dataFlag} onChange={(event) => setDataFlag(event.target.value)}>
          {flags.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
      <Field label="Notes" className="span-2">
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <div className="actions span-2">
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save work order'}
        </button>
        <Link className="btn btn-ghost" to={workOrder ? `/w/${workOrder.wo_id}` : '/work'}>
          Cancel
        </Link>
      </div>
    </form>
  )
}
