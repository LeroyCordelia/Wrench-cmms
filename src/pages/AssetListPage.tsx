import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useCmms } from '../data/context'
import { listValues, locationLabel } from '../domain/format'
import { usePageMeta } from '../Shell'
import { AssetCard } from '../ui'

export function AssetListPage() {
  const { snapshot } = useCmms()
  usePageMeta('Assets')
  const [query, setQuery] = useState('')
  const [locationId, setLocationId] = useState('')
  const [category, setCategory] = useState('')
  const [criticality, setCriticality] = useState('')
  const [status, setStatus] = useState('')
  const categories = listValues(snapshot.lists.headers, snapshot.lists.rows, 'category')
  const statuses = listValues(snapshot.lists.headers, snapshot.lists.rows, 'asset_status')

  const assets = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return snapshot.assets
      .filter((asset) => {
        if (locationId && asset.location_id !== locationId) return false
        if (category && asset.category !== category) return false
        if (criticality && asset.criticality !== criticality) return false
        if (status && asset.status !== status) return false
        if (!needle) return true
        const hay = [asset.asset_id, asset.name, asset.manufacturer, asset.model, asset.serial, asset.category, asset.notes]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(needle)
      })
      .sort((a, b) => {
        const rank = (value: string) => (value === 'A' ? 0 : value === 'B' ? 1 : 2)
        return rank(a.criticality) - rank(b.criticality) || a.name.localeCompare(b.name)
      })
  }, [snapshot.assets, query, locationId, category, criticality, status])

  return (
    <>
      <div className="search">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, ID, or serial"
          aria-label="Search assets"
        />
      </div>
      <div className="chip-row" role="group" aria-label="Criticality">
        {['', 'A', 'B', 'C'].map((value) => (
          <button
            key={value || 'all'}
            type="button"
            className="chip"
            aria-pressed={criticality === value}
            onClick={() => setCriticality(value)}
          >
            {value ? `Criticality ${value}` : 'All criticality'}
          </button>
        ))}
      </div>
      <div className="form-grid two" style={{ margin: '10px 0' }}>
        <label className="field">
          <span>Location</span>
          <select value={locationId} onChange={(event) => setLocationId(event.target.value)}>
            <option value="">All locations</option>
            {snapshot.locations.map((location) => (
              <option key={location.location_id} value={location.location_id}>
                {locationLabel(snapshot.locations, location.location_id)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {statuses.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="between" style={{ marginBottom: 8 }}>
        <p className="muted">{assets.length} assets</p>
        <Link to="/assets/new" className="btn btn-primary">
          <Plus size={18} /> New asset
        </Link>
      </div>
      <div className="stack">
        {assets.map((asset) => (
          <AssetCard key={asset.asset_id} asset={asset} location={locationLabel(snapshot.locations, asset.location_id)} />
        ))}
        {assets.length === 0 && <p className="card">No assets match those filters.</p>}
      </div>
    </>
  )
}
