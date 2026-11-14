import { useRef, useState } from 'react'
import { useCmms } from '../data/context'
import { todayPacific } from '../domain/dates'
import { usePageMeta } from '../Shell'

export function SettingsPage() {
  usePageMeta('Settings')
  const { snapshot, settings, updateSettings, importWorkbook, exportWorkbook, resetDemo } = useCmms()
  const fileRef = useRef<HTMLInputElement>(null)
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onImport(file: File) {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await importWorkbook(await file.arrayBuffer())
      const warning = result.warnings.length ? ` ${result.warnings.join(' ')}` : ''
      setMessage(`Loaded ${result.assets} assets, ${result.workOrders} work orders, and ${result.parts} parts onto this phone.${warning}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That workbook could not be loaded.')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onExport() {
    setBusy(true)
    setError(null)
    try {
      const blob = await exportWorkbook()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `CMMS_Data_${todayPacific().replaceAll('/', '-')}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
      setMessage('The workbook downloaded. Copy it back to OneDrive when you want that file to be the latest.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The workbook could not be exported.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <h2>Who is using this phone</h2>
        <label className="field">
          <span>Technician</span>
          <select
            value={settings.techId ?? ''}
            onChange={(event) => void updateSettings({ techId: event.target.value || null })}
          >
            <option value="">Not set</option>
            {snapshot.technicians.map((tech) => (
              <option key={tech.tech_id} value={tech.tech_id}>
                {tech.name} · {tech.craft ?? 'tech'} · {tech.shift ?? 'shift'}
                {tech.active === 'no' ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">New jobs default to this person. It is stored on the phone, not in the Excel file.</p>
      </section>
      <section className="card">
        <h2>Web address for QR codes</h2>
        <label className="field">
          <span>Base URL</span>
          <input
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            onBlur={() => void updateSettings({ baseUrl: baseUrl.trim() || 'https://cmms.local' })}
            inputMode="url"
            autoCapitalize="off"
            spellCheck={false}
          />
        </label>
        <p className="muted">
          Printed labels open this address plus /a/AST-0001 or /w/WO-000001. Change only the site address. Do not remove the idea of those paths.
        </p>
      </section>
      <section className="card">
        <h2>Excel workbook</h2>
        <p>The sheets and column names stay the same as the template. Loading a file replaces the copy on this phone. IDs already used here stay retired.</p>
        {message && <p className="saved-note">{message}</p>}
        {error && <p className="form-error">{error}</p>}
        <div className="actions">
          <button className="btn btn-primary" type="button" disabled={busy} onClick={() => fileRef.current?.click()}>
            Load an Excel file
          </button>
          <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => void onExport()}>
            Download Excel
          </button>
          <a className="btn btn-ghost" href={`${import.meta.env.BASE_URL}CMMS_Data_Template.xlsx`}>
            Download the original template
          </a>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void onImport(file)
          }}
        />
      </section>
      <section className="card">
        <h2>Example data</h2>
        <p>Puts the sample bottling-line workbook back on this phone. Jobs you created here are replaced. Files you already downloaded are not changed.</p>
        <button
          className="btn btn-danger"
          type="button"
          onClick={() => {
            const ok = window.confirm('Put the example workbook back on this phone?')
            if (ok) {
              void resetDemo()
              setMessage('Example data is loaded again.')
              setError(null)
            }
          }}
        >
          Reset to example data
        </button>
      </section>
      <section className="card">
        <h2>About</h2>
        <p>Wrench phase 1 for the Suisun City winery and bottling plant. Units are US customary only: °F, psi, gallons, feet, pounds, and hp. Dates are MM/DD/YYYY, Pacific time. Money is US dollars.</p>
        <p className="muted">After the first visit, the screens and the book on this phone keep working without a signal.</p>
      </section>
    </div>
  )
}
