import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCmms } from '../data/context'
import { fromDateInput, toDateInput } from '../domain/dates'
import { formatId } from '../domain/ids'
import { listValues, locationLabel, withCurrentOption } from '../domain/format'
import type { Asset } from '../domain/types'
import { usePageMeta } from '../Shell'
import { Field, MissingRecord, parseOptionalNumber } from '../ui'

export function AssetFormPage() {
  const { id } = useParams()
  const { snapshot } = useCmms()
  const asset = id ? snapshot.assets.find((row) => row.asset_id === id.toUpperCase()) : undefined
  usePageMeta(asset ? `Edit ${asset.asset_id}` : 'New asset', asset ? `/a/${asset.asset_id}` : '/assets')
  if (id && !asset) {
    return <MissingRecord title="Asset not found" body="That asset is not on this phone, so it cannot be edited." />
  }
  return <AssetForm asset={asset} />
}

function AssetForm({ asset }: { asset?: Asset }) {
  const { snapshot, saveAsset } = useCmms()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(asset?.name ?? '')
  const [category, setCategory] = useState(asset?.category ?? 'other')
  const [locationId, setLocationId] = useState(asset?.location_id ?? snapshot.locations[0]?.location_id ?? '')
  const [parentId, setParentId] = useState(asset?.parent_asset_id ?? '')
  const [manufacturer, setManufacturer] = useState(asset?.manufacturer ?? '')
  const [model, setModel] = useState(asset?.model ?? '')
  const [serial, setSerial] = useState(asset?.serial ?? '')
  const [installDate, setInstallDate] = useState(toDateInput(asset?.install_date ?? null))
  const [criticality, setCriticality] = useState(asset?.criticality ?? 'B')
  const [status, setStatus] = useState(asset?.status ?? 'in service')
  const [hp, setHp] = useState(asset?.hp == null ? '' : String(asset.hp))
  const [voltage, setVoltage] = useState(asset?.voltage == null ? '' : String(asset.voltage))
  const [phase, setPhase] = useState(asset?.phase ?? '')
  const [fla, setFla] = useState(asset?.fla_amps == null ? '' : String(asset.fla_amps))
  const [rpm, setRpm] = useState(asset?.rpm == null ? '' : String(asset.rpm))
  const [psi, setPsi] = useState(asset?.design_psi == null ? '' : String(asset.design_psi))
  const [gallons, setGallons] = useState(asset?.capacity_gal == null ? '' : String(asset.capacity_gal))
  const [notes, setNotes] = useState(asset?.notes ?? '')
  const [dataFlag, setDataFlag] = useState(asset?.data_flag ?? 'REAL')
  const nextId = formatId('asset', snapshot.highWater.asset + 1)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const saved = await saveAsset({
        asset_id: asset?.asset_id ?? '',
        name,
        category,
        location_id: locationId,
        parent_asset_id: parentId || null,
        manufacturer,
        model,
        serial,
        install_date: fromDateInput(installDate),
        criticality,
        status,
        hp: parseOptionalNumber(hp, 'Horsepower'),
        voltage: parseOptionalNumber(voltage, 'Voltage'),
        phase,
        fla_amps: parseOptionalNumber(fla, 'Full-load amps'),
        rpm: parseOptionalNumber(rpm, 'Speed'),
        design_psi: parseOptionalNumber(psi, 'Design pressure'),
        capacity_gal: parseOptionalNumber(gallons, 'Capacity'),
        notes,
        data_flag: dataFlag,
      })
      navigate(`/a/${saved.asset_id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the asset.')
      setSaving(false)
    }
  }

  const categories = withCurrentOption(listValues(snapshot.lists.headers, snapshot.lists.rows, 'category'), category)
  const criticalities = withCurrentOption(listValues(snapshot.lists.headers, snapshot.lists.rows, 'criticality'), criticality)
  const statuses = withCurrentOption(listValues(snapshot.lists.headers, snapshot.lists.rows, 'asset_status'), status)
  const phases = withCurrentOption(listValues(snapshot.lists.headers, snapshot.lists.rows, 'phase'), phase)
  const flags = withCurrentOption(listValues(snapshot.lists.headers, snapshot.lists.rows, 'data_flag'), dataFlag)

  return (
    <form onSubmit={onSubmit} className="form-grid two">
      {error && <p className="form-error span-2">{error}</p>}
      <p className="muted span-2">
        {asset ? (
          <>
            ID <span className="mono">{asset.asset_id}</span> stays with this machine. It is never reused.
          </>
        ) : (
          <>
            The next ID will be <span className="mono">{nextId}</span>. IDs are never reused.
          </>
        )}
      </p>
      <Field label="Name" className="span-2">
        <input value={name} onChange={(event) => setName(event.target.value)} required />
      </Field>
      <Field label="Category">
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
      <Field label="Criticality">
        <select value={criticality} onChange={(event) => setCriticality(event.target.value)}>
          {criticalities.map((value) => (
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
      <Field label="Location">
        <select value={locationId} onChange={(event) => setLocationId(event.target.value)}>
          {snapshot.locations.map((location) => (
            <option key={location.location_id} value={location.location_id}>
              {locationLabel(snapshot.locations, location.location_id)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Parent asset" className="span-2">
        <select value={parentId} onChange={(event) => setParentId(event.target.value)}>
          <option value="">None</option>
          {snapshot.assets
            .filter((row) => row.asset_id !== asset?.asset_id)
            .map((row) => (
              <option key={row.asset_id} value={row.asset_id}>
                {row.asset_id} · {row.name}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Manufacturer">
        <input value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} />
      </Field>
      <Field label="Model">
        <input value={model} onChange={(event) => setModel(event.target.value)} />
      </Field>
      <Field label="Serial">
        <input value={serial} onChange={(event) => setSerial(event.target.value)} />
      </Field>
      <Field label="Installed">
        <input type="date" value={installDate} onChange={(event) => setInstallDate(event.target.value)} />
      </Field>
      <Field label="Horsepower (hp)">
        <input inputMode="decimal" value={hp} onChange={(event) => setHp(event.target.value)} />
      </Field>
      <Field label="Voltage (V)">
        <input inputMode="decimal" value={voltage} onChange={(event) => setVoltage(event.target.value)} />
      </Field>
      <Field label="Phase">
        <select value={phase} onChange={(event) => setPhase(event.target.value)}>
          <option value="">—</option>
          {phases.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
      <Field label="Full-load amps">
        <input inputMode="decimal" value={fla} onChange={(event) => setFla(event.target.value)} />
      </Field>
      <Field label="Speed (rpm)">
        <input inputMode="decimal" value={rpm} onChange={(event) => setRpm(event.target.value)} />
      </Field>
      <Field label="Design pressure (psi)">
        <input inputMode="decimal" value={psi} onChange={(event) => setPsi(event.target.value)} />
      </Field>
      <Field label="Capacity (gallons)">
        <input inputMode="decimal" value={gallons} onChange={(event) => setGallons(event.target.value)} />
      </Field>
      <Field label="Notes" className="span-2">
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <Field label="Data flag">
        <select value={dataFlag} onChange={(event) => setDataFlag(event.target.value)}>
          {flags.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
      <div className="actions span-2">
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save asset'}
        </button>
        <Link className="btn btn-ghost" to={asset ? `/a/${asset.asset_id}` : '/assets'}>
          Cancel
        </Link>
      </div>
    </form>
  )
}
