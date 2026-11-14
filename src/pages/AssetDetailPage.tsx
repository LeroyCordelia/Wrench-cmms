import { Link, Navigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useCmms } from '../data/context'
import { assetUrl } from '../domain/qr'
import {
  assetIdList,
  formatUsd,
  frequencyLabel,
  isClosedStatus,
  locationLabel,
  pmOverdue,
  trimNum,
} from '../domain/format'
import { nowPacific, stampUtc } from '../domain/dates'
import { usePageMeta } from '../Shell'
import { MissingRecord, StatusChip, WorkOrderCard } from '../ui'

export function AssetDetailPage() {
  const params = useParams()
  const raw = params.id ?? ''
  const id = raw.toUpperCase()
  if (raw && raw !== id) return <Navigate to={`/a/${id}`} replace />
  return <AssetDetail id={id} />
}

function AssetDetail({ id }: { id: string }) {
  const { snapshot, settings, today } = useCmms()
  const asset = snapshot.assets.find((row) => row.asset_id === id)
  usePageMeta(asset?.name ?? 'Asset', '/assets')
  if (!asset) {
    return (
      <MissingRecord
        title={`${id} was not found`}
        body="No asset with that ID is stored on this phone. If you just scanned a label, load the Excel file that contains it from Settings."
      />
    )
  }
  const parent = snapshot.assets.find((row) => row.asset_id === asset.parent_asset_id)
  const children = snapshot.assets.filter((row) => row.parent_asset_id === asset.asset_id)
  const orders = snapshot.workOrders
    .filter((row) => row.asset_id === asset.asset_id)
    .sort((a, b) => (b.created ? stampUtc(b.created) : 0) - (a.created ? stampUtc(a.created) : 0))
  const openOrders = orders.filter((row) => !isClosedStatus(row.status))
  const history = orders.filter((row) => isClosedStatus(row.status))
  const pms = snapshot.pmSchedules.filter((row) => row.asset_id === asset.asset_id)
  const parts = snapshot.parts.filter((part) => assetIdList(part.used_on_asset_ids).includes(asset.asset_id))
  const readings = snapshot.meterReadings
    .filter((row) => row.asset_id === asset.asset_id)
    .sort((a, b) => (b.timestamp ? stampUtc(b.timestamp) : 0) - (a.timestamp ? stampUtc(a.timestamp) : 0))
  const url = assetUrl(settings.baseUrl, asset.asset_id)
  const nameplate = [
    ['Manufacturer', asset.manufacturer ?? ''],
    ['Model', asset.model ?? ''],
    ['Serial', asset.serial ?? ''],
    ['Installed', asset.install_date ?? ''],
    ['Power', asset.hp == null ? '' : `${trimNum(asset.hp)} hp`],
    ['Voltage', asset.voltage == null ? '' : `${trimNum(asset.voltage)} V`],
    ['Phase', asset.phase ? `${asset.phase}-phase` : ''],
    ['FLA', asset.fla_amps == null ? '' : `${trimNum(asset.fla_amps)} A`],
    ['Speed', asset.rpm == null ? '' : `${trimNum(asset.rpm)} rpm`],
    ['Design pressure', asset.design_psi == null ? '' : `${trimNum(asset.design_psi)} psi`],
    ['Capacity', asset.capacity_gal == null ? '' : `${trimNum(asset.capacity_gal)} gal`],
  ].filter((entry): entry is [string, string] => entry[1] !== '')

  return (
    <>
      <article className="card hero-card">
        <div>
          <div className="row wrap">
            <span className={`crit crit-${asset.criticality.toLowerCase()}`}>{asset.criticality}</span>
            <StatusChip status={asset.status} />
            {asset.data_flag === 'EXAMPLE' && <span className="chip">Example</span>}
          </div>
          <h2>{asset.name}</h2>
          <p className="meta">
            <span className="mono">{asset.asset_id}</span>
            <span>{asset.category}</span>
          </p>
          <p className="muted">
            {locationLabel(snapshot.locations, asset.location_id)}
            {asset.location_detail ? ` · ${asset.location_detail}` : ''}
          </p>
        </div>
        <div className="qr-wrap" title={url}>
          <QRCodeSVG value={url} size={88} />
        </div>
      </article>
      <div className="actions-row no-print" style={{ marginTop: 10 }}>
        <Link className="btn btn-ghost" to={`/assets/${asset.asset_id}/edit`}>
          Edit
        </Link>
        <Link className="btn btn-primary" to={`/work/new?asset=${asset.asset_id}`}>
          New job
        </Link>
        <Link className="btn btn-ghost" to={`/labels?asset=${asset.asset_id}`}>
          Print label
        </Link>
      </div>
      {asset.notes && (
        <>
          <h3 className="section-title">Notes</h3>
          <p className="card prose">{asset.notes}</p>
        </>
      )}
      <h3 className="section-title">Where it sits</h3>
      <div className="stack">
        {parent ? (
          <Link className="child-link" to={`/a/${parent.asset_id}`}>
            <span>Parent · {parent.name}</span>
            <span className="mono">{parent.asset_id}</span>
          </Link>
        ) : (
          <p className="card">No parent. This is a top-level system or a standalone machine.</p>
        )}
        {children.map((child) => (
          <Link key={child.asset_id} className="child-link" to={`/a/${child.asset_id}`}>
            <span>{child.name}</span>
            <span className="mono">{child.asset_id}</span>
          </Link>
        ))}
      </div>
      <h3 className="section-title">Open work orders</h3>
      <div className="stack">
        {openOrders.map((workOrder) => (
          <WorkOrderCard key={workOrder.wo_id} workOrder={workOrder} assetName={asset.name} now={nowPacific()} />
        ))}
        {openOrders.length === 0 && <p className="card">No open jobs on this asset.</p>}
      </div>
      {nameplate.length > 0 && (
        <>
          <h3 className="section-title">Nameplate</h3>
          <dl className="nameplate">
            {nameplate.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="muted">US customary units: hp, volts, psi, gallons.</p>
        </>
      )}
      <h3 className="section-title">PM schedules</h3>
      <div className="stack">
        {pms.map((pm) => (
          <article key={pm.pm_id} className="card" style={pmOverdue(pm, today) ? { background: '#fff8f7' } : undefined}>
            <div className="between">
              <span className="mono">{pm.pm_id}</span>
              {pmOverdue(pm, today) && <span className="chip pri pri-1">Overdue</span>}
            </div>
            <p>{pm.task}</p>
            <p className="muted">
              {frequencyLabel(pm)}
              {pm.next_due ? ` · Next ${pm.next_due}` : ' · Meter-based'}
              {pm.last_done ? ` · Last ${pm.last_done}` : ''}
            </p>
          </article>
        ))}
        {pms.length === 0 && <p className="card">No PM schedule on this asset yet.</p>}
      </div>
      <h3 className="section-title">Work order history</h3>
      <div className="stack">
        {history.map((workOrder) => (
          <WorkOrderCard key={workOrder.wo_id} workOrder={workOrder} assetName={asset.name} now={nowPacific()} />
        ))}
        {history.length === 0 && <p className="card">No closed jobs yet.</p>}
      </div>
      {parts.length > 0 && (
        <>
          <h3 className="section-title">Parts that fit</h3>
          <div className="stack">
            {parts.map((part) => (
              <article key={part.part_id} className="card">
                <strong>{part.description}</strong>
                <p className="muted">
                  {part.part_id} · {part.qty_on_hand ?? 0} on hand · {formatUsd(part.unit_cost_usd)} · bin {part.bin_location ?? '—'}
                </p>
              </article>
            ))}
          </div>
        </>
      )}
      {(snapshot.assetAttributes ?? []).some((row) => row.asset_id === asset.asset_id) && (
        <>
          <h3 className="section-title">Attributes</h3>
          <dl className="nameplate">
            {(snapshot.assetAttributes ?? [])
              .filter((row) => row.asset_id === asset.asset_id)
              .map((row) => (
                <div key={row.attribute}>
                  <dt>{row.attribute}</dt>
                  <dd>
                    {row.value ?? '—'}
                    {row.unit ? ` ${row.unit}` : ''}
                  </dd>
                </div>
              ))}
          </dl>
        </>
      )}
      {readings.length > 0 && (
        <>
          <h3 className="section-title">Latest readings</h3>
          <div className="stack">
            {readings.slice(0, 4).map((reading, index) => (
              <article key={`${reading.timestamp}-${reading.unit}-${index}`} className="card">
                <strong>
                  {reading.reading == null ? '—' : trimNum(reading.reading)} {reading.unit}
                </strong>
                <p className="muted">
                  {reading.timestamp} · {reading.source}
                </p>
              </article>
            ))}
          </div>
        </>
      )}
      <p className="link-quiet muted">Label link: {url}</p>
    </>
  )
}
