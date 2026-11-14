import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useCmms } from '../data/context'
import { assetUrl, workOrderUrl } from '../domain/qr'
import { locationLabel, priorityLabel } from '../domain/format'
import { usePageMeta } from '../Shell'

type Kind = 'asset' | 'work'
type Format = '5163' | '5160'

export function LabelsPage() {
  usePageMeta('QR labels')
  const { snapshot, settings } = useCmms()
  const [params] = useSearchParams()
  const focusAsset = params.get('asset')?.toUpperCase() ?? ''
  const focusWork = params.get('work')?.toUpperCase() ?? ''
  const [kind, setKind] = useState<Kind>(focusWork ? 'work' : 'asset')
  const [format, setFormat] = useState<Format>('5163')
  const [picked, setPicked] = useState<string[]>(() => {
    if (focusAsset) return [focusAsset]
    if (focusWork) return [focusWork]
    return snapshot.assets.filter((asset) => asset.status !== 'retired').map((asset) => asset.asset_id)
  })

  const records = useMemo(() => {
    if (kind === 'asset') {
      return snapshot.assets
        .filter((asset) => picked.includes(asset.asset_id))
        .map((asset) => ({
          id: asset.asset_id,
          title: asset.name,
          line2: asset.asset_id,
          line3: locationLabel(snapshot.locations, asset.location_id),
          url: assetUrl(settings.baseUrl, asset.asset_id),
        }))
    }
    return snapshot.workOrders
      .filter((row) => picked.includes(row.wo_id))
      .map((row) => ({
        id: row.wo_id,
        title: snapshot.assets.find((asset) => asset.asset_id === row.asset_id)?.name ?? row.asset_id,
        line2: row.wo_id,
        line3: `${priorityLabel(row.priority)}${row.due ? ` · Due ${row.due}` : ''}`,
        url: workOrderUrl(settings.baseUrl, row.wo_id),
      }))
  }, [kind, picked, snapshot, settings.baseUrl])

  const perPage = format === '5160' ? 30 : 10
  const pages: typeof records[] = []
  for (let index = 0; index < records.length; index += perPage) pages.push(records.slice(index, index + perPage))
  if (pages.length === 0) pages.push([])

  function chooseKind(next: Kind) {
    setKind(next)
    setPicked(
      next === 'asset'
        ? snapshot.assets.filter((asset) => asset.status !== 'retired').map((asset) => asset.asset_id)
        : snapshot.workOrders.filter((row) => row.status !== 'canceled').map((row) => row.wo_id),
    )
  }

  function toggle(id: string) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  const choices = kind === 'asset' ? snapshot.assets.map((asset) => ({ id: asset.asset_id, label: asset.name })) : snapshot.workOrders.map((row) => ({ id: row.wo_id, label: row.problem }))
  const qrSize = format === '5160' ? 62 : 118

  return (
    <>
      <div className="no-print">
        {settings.baseUrl.includes('cmms.local') && (
          <p className="example-banner">
            Labels currently point at cmms.local, which is only a placeholder. Set the web address in Settings before you print tags that will be stuck on a machine.
          </p>
        )}
        <div className="chip-row">
          <button type="button" className="chip" aria-pressed={kind === 'asset'} onClick={() => chooseKind('asset')}>
            Assets
          </button>
          <button type="button" className="chip" aria-pressed={kind === 'work'} onClick={() => chooseKind('work')}>
            Work orders
          </button>
          <button type="button" className="chip" aria-pressed={format === '5163'} onClick={() => setFormat('5163')}>
            Avery 5163
          </button>
          <button type="button" className="chip" aria-pressed={format === '5160'} onClick={() => setFormat('5160')}>
            Avery 5160
          </button>
        </div>
        <p className="muted">
          {format === '5163' ? '10 labels per sheet, 4 × 2 in. Better for asset tags.' : '30 labels per sheet, 2⅝ × 1 in.'} {records.length} selected.
        </p>
        <button className="btn btn-primary" type="button" onClick={() => window.print()} disabled={records.length === 0}>
          Print sheet
        </button>
      </div>
      <div className="label-stage" style={{ marginTop: 12 }}>
        {pages.map((page, pageIndex) => (
          <section key={pageIndex} className={`label-page format-${format}`}>
            {page.map((label) => (
              <article key={label.id} className="label">
                <QRCodeSVG value={label.url} size={qrSize} level="M" />
                <div className="label-copy">
                  <strong>{label.title}</strong>
                  <span className="mono">{label.line2}</span>
                  <span>{label.line3}</span>
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>
      <div className="no-print" style={{ marginTop: 12 }}>
        <div className="between">
          <h3 className="section-title" style={{ marginTop: 0 }}>
            On this sheet
          </h3>
          <button
            type="button"
            className="btn btn-text"
            onClick={() => setPicked(picked.length === choices.length ? [] : choices.map((choice) => choice.id))}
          >
            {picked.length === choices.length ? 'Clear' : 'Select all'}
          </button>
        </div>
        <div className="check-list">
          {choices.map((choice) => (
            <label key={choice.id} className="check-row">
              <input type="checkbox" checked={picked.includes(choice.id)} onChange={() => toggle(choice.id)} />
              <span>
                <strong className="mono">{choice.id}</strong>
                <span className="muted" style={{ display: 'block' }}>
                  {choice.label}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </>
  )
}
