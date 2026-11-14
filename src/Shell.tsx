import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Boxes,
  CalendarClock,
  ClipboardList,
  Ellipsis,
  House,
  Package,
  Printer,
  QrCode,
  Settings,
  Wrench,
  ChevronLeft,
} from 'lucide-react'
import { useCmms } from './data/context'
import { isClosedStatus } from './domain/format'

interface PageMeta {
  title: string
  back?: string
}

const MetaContext = createContext<(meta: PageMeta) => void>(() => {})

export function usePageMeta(title: string, back?: string) {
  const setMeta = useContext(MetaContext)
  useEffect(() => {
    setMeta({ title, back })
    document.title = `${title} · Wrench`
  }, [title, back, setMeta])
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

export function Shell() {
  const { snapshot } = useCmms()
  const [meta, setMeta] = useState<PageMeta>({ title: 'Today' })
  const online = useOnline()
  const path = useLocation().pathname
  const openCount = snapshot.workOrders.filter((row) => !isClosedStatus(row.status)).length
  const onToday = path === '/'
  const onWork = path.startsWith('/work') || path.startsWith('/w/')
  const onAssets = path.startsWith('/assets') || path.startsWith('/a/')
  const onScan = path.startsWith('/scan')
  const onMore = ['/more', '/pm', '/parts', '/labels', '/settings'].some((prefix) => path.startsWith(prefix))

  return (
    <MetaContext.Provider value={setMeta}>
      <div className="shell">
        <aside className="sidenav">
          <div className="brand">
            <span className="brand-mark" aria-hidden>
              <Wrench size={22} />
            </span>
            <span>
              <strong>Wrench</strong>
              <small>Suisun City</small>
            </span>
          </div>
          <SideLink to="/" active={onToday} icon={<House size={18} />} label="Today" />
          <SideLink to="/work" active={onWork} icon={<ClipboardList size={18} />} label="Work orders" count={openCount} />
          <SideLink to="/assets" active={onAssets} icon={<Boxes size={18} />} label="Assets" />
          <SideLink to="/pm" active={path.startsWith('/pm')} icon={<CalendarClock size={18} />} label="PM schedules" />
          <SideLink to="/parts" active={path.startsWith('/parts')} icon={<Package size={18} />} label="Parts" />
          <SideLink to="/labels" active={path.startsWith('/labels')} icon={<Printer size={18} />} label="QR labels" />
          <SideLink to="/scan" active={onScan} icon={<QrCode size={18} />} label="Scan QR" />
          <SideLink to="/settings" active={path.startsWith('/settings')} icon={<Settings size={18} />} label="Settings" />
        </aside>
        <div className="main">
          <header className="topbar">
            {meta.back && (
              <NavLink to={meta.back} className="topbar-back" aria-label="Back">
                <ChevronLeft />
              </NavLink>
            )}
            <h1>{meta.title}</h1>
            {!online && <span className="offline-pill">Offline</span>}
          </header>
          <div className="content">
            <Outlet />
          </div>
        </div>
        <nav className="tabbar" aria-label="Primary">
          <NavLink to="/" className={`tab-link ${onToday ? 'active' : ''}`}>
            <House size={20} />
            Today
          </NavLink>
          <NavLink to="/work" className={`tab-link ${onWork ? 'active' : ''}`}>
            <ClipboardList size={20} />
            Work
          </NavLink>
          <NavLink to="/scan" className={`tab-scan ${onScan ? 'active' : ''}`} aria-label="Scan QR">
            <QrCode size={26} />
          </NavLink>
          <NavLink to="/assets" className={`tab-link ${onAssets ? 'active' : ''}`}>
            <Boxes size={20} />
            Assets
          </NavLink>
          <NavLink to="/more" className={`tab-link ${onMore ? 'active' : ''}`}>
            <Ellipsis size={20} />
            More
          </NavLink>
        </nav>
      </div>
    </MetaContext.Provider>
  )
}

function SideLink({
  to,
  active,
  icon,
  label,
  count,
}: {
  to: string
  active: boolean
  icon: ReactNode
  label: string
  count?: number
}) {
  return (
    <NavLink to={to} className={`nav-link ${active ? 'active' : ''}`}>
      {icon}
      {label}
      {count ? <span className="nav-count">{count}</span> : null}
    </NavLink>
  )
}
