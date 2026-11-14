import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useCmms } from '../data/context'
import { assetIdList, formatUsd, isLowStock, trimNum } from '../domain/format'
import { usePageMeta } from '../Shell'

export function PartsPage() {
  usePageMeta('Parts')
  const { snapshot } = useCmms()
  const [query, setQuery] = useState('')
  const parts = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return snapshot.parts
      .filter((part) => {
        if (!needle) return true
        return [part.part_id, part.description, part.bin_location, part.vendor, part.mfr_part_no]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => Number(isLowStock(b)) - Number(isLowStock(a)) || a.part_id.localeCompare(b.part_id))
  }, [snapshot.parts, query])

  return (
    <>
      <p className="muted">On-hand counts are shown here. Issuing a part does not deduct stock yet.</p>
      <div className="search" style={{ marginTop: 10 }}>
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search parts or bins" aria-label="Search parts" />
      </div>
      <div className="stack">
        {parts.map((part) => {
          const low = isLowStock(part)
          const assets = assetIdList(part.used_on_asset_ids)
          return (
            <article key={part.part_id} className={`card ${low ? 'low' : ''}`}>
              <div className="between wrap">
                <span className="mono">{part.part_id}</span>
                {low && <span className="chip pri pri-2">Low stock</span>}
              </div>
              <h2>{part.description}</h2>
              <p className="muted">
                {trimNum(part.qty_on_hand ?? 0)} {part.uom ?? 'on hand'} · min {part.min_qty ?? '—'} · bin {part.bin_location ?? '—'}
              </p>
              <p className="muted">
                {formatUsd(part.unit_cost_usd)}
                {part.vendor ? ` · ${part.vendor}` : ''}
              </p>
              {assets.length > 0 && (
                <p>
                  {assets.map((id) => (
                    <Link key={id} to={`/a/${id}`} style={{ marginRight: 8 }}>
                      {snapshot.assets.find((asset) => asset.asset_id === id)?.name ?? id}
                    </Link>
                  ))}
                </p>
              )}
            </article>
          )
        })}
      </div>
    </>
  )
}
