import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useCmms } from '../data/context'
import { listValues, locationLabel } from '../domain/format'
import type { Asset } from '../domain/types'
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
  const [view, setView] = useState<'tree' | 'list'>('tree')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [shown, setShown] = useState(60)
  const sentinel = useRef<HTMLDivElement>(null)
  const categories = listValues(snapshot.lists.headers, snapshot.lists.rows, 'category')
  const statuses = listValues(snapshot.lists.headers, snapshot.lists.rows, 'asset_status')
  const filtering = Boolean(query.trim() || locationId || category || criticality || status)
  const showTree = view === 'tree' && !filtering

  const childrenOf = useMemo(() => {
    const map = new Map<string, Asset[]>()
    for (const asset of snapshot.assets) {
      const key = asset.parent_asset_id || ''
      const list = map.get(key)
      if (list) list.push(asset)
      else map.set(key, [asset])
    }
    return map
  }, [snapshot.assets])

  const assets = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return snapshot.assets
      .filter((asset) => {
        if (locationId && asset.location_id !== locationId) return false
        if (category && asset.category !== category) return false
        if (criticality && asset.criticality !== criticality) return false
        if (status && asset.status !== status) return false
        if (!needle) return true
        const hay = [asset.asset_id, asset.name, asset.manufacturer, asset.model, asset.serial, asset.category, asset.location_detail, asset.notes]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(needle)
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [snapshot.assets, query, locationId, category, criticality, status])

  useEffect(() => {
    setShown(60)
  }, [query, locationId, category, criticality, status, view])

  useEffect(() => {
    const node = sentinel.current
    if (!node || showTree) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setShown((count) => count + 60)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [showTree, shown, assets.length])

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function TreeBranch({ parentId, depth }: { parentId: string; depth: number }) {
    const nodes = childrenOf.get(parentId) ?? []
    return nodes.map((asset) => {
      const childCount = childrenOf.get(asset.asset_id)?.length ?? 0
      const open = expanded.has(asset.asset_id)
      return (
        <div key={asset.asset_id}>
          <div className="tree-row" style={{ paddingLeft: depth * 14 }}>
            {childCount > 0 ? (
              <button type="button" className="tree-toggle" aria-expanded={open} aria-label={open ? 'Collapse' : 'Expand'} onClick={() => toggle(asset.asset_id)}>
                {open ? '▾' : '▸'}
              </button>
            ) : (
              <span className="tree-toggle" aria-hidden />
            )}
            <Link to={`/a/${asset.asset_id}`} className="tree-link">
              <strong>{asset.name}</strong>
              <span>
                <span className="mono">{asset.asset_id}</span>
                {asset.category ? ` · ${asset.category}` : ''}
                {childCount > 0 ? ` · ${childCount}` : ''}
              </span>
            </Link>
          </div>
          {open && childCount > 0 ? <TreeBranch parentId={asset.asset_id} depth={depth + 1} /> : null}
        </div>
      )
    })
  }

  return (
    <>
      <div className="search">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, ID, or serial" aria-label="Search assets" />
      </div>
      <div className="chip-row" role="group" aria-label="Asset view">
        <button type="button" className="chip" aria-pressed={view === 'tree'} onClick={() => setView('tree')}>
          Tree
        </button>
        <button type="button" className="chip" aria-pressed={view === 'list'} onClick={() => setView('list')}>
          List
        </button>
        {['', 'A', 'B', 'C'].map((value) => (
          <button key={value || 'all'} type="button" className="chip" aria-pressed={criticality === value} onClick={() => setCriticality(value)}>
            {value ? `Criticality ${value}` : 'All criticality'}
          </button>
        ))}
      </div>
      <details className="filter-drawer">
        <summary>Filters</summary>
        <div className="form-grid" style={{ marginTop: 10 }}>
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
      </details>
      <div className="between" style={{ margin: '10px 0 8px' }}>
        <p className="muted">{showTree ? `${childrenOf.get('')?.length ?? 0} top-level` : `${assets.length} assets`}</p>
        <Link to="/assets/new" className="btn btn-primary">
          <Plus size={18} /> New asset
        </Link>
      </div>
      {showTree ? (
        <div className="card tree">
          <TreeBranch parentId="" depth={0} />
        </div>
      ) : (
        <div className="stack">
          {assets.slice(0, shown).map((asset) => (
            <AssetCard key={asset.asset_id} asset={asset} location={locationLabel(snapshot.locations, asset.location_id)} />
          ))}
          {assets.length === 0 && <p className="card">No assets match those filters.</p>}
          {shown < assets.length && <div ref={sentinel} className="muted">Loading more…</div>}
        </div>
      )}
    </>
  )
}
