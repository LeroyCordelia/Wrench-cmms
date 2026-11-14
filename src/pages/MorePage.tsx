import { Link } from 'react-router-dom'
import { CalendarClock, Package, Printer, Settings } from 'lucide-react'
import { usePageMeta } from '../Shell'

const LINKS = [
  { to: '/pm', title: 'PM schedules', body: 'What is due and what is overdue', icon: CalendarClock },
  { to: '/parts', title: 'Parts', body: 'Bins, cost, and low stock', icon: Package },
  { to: '/labels', title: 'QR labels', body: 'Print an Avery sheet', icon: Printer },
  { to: '/settings', title: 'Settings', body: 'Excel file, QR address, who you are', icon: Settings },
]

export function MorePage() {
  usePageMeta('More')
  return (
    <div className="stack">
      {LINKS.map((link) => (
        <Link key={link.to} to={link.to} className="more-link">
          <span>
            <strong>{link.title}</strong>
            <span>{link.body}</span>
          </span>
          <link.icon />
        </Link>
      ))}
    </div>
  )
}
