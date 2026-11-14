import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import { useCmmsGate } from './data/context'
import { Shell } from './Shell'
import { AssetDetailPage } from './pages/AssetDetailPage'
import { AssetFormPage } from './pages/AssetFormPage'
import { AssetListPage } from './pages/AssetListPage'
import { HomePage } from './pages/HomePage'
import { LabelsPage } from './pages/LabelsPage'
import { MorePage } from './pages/MorePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PartsPage } from './pages/PartsPage'
import { PmDetailPage } from './pages/PmDetailPage'
import { PmPage } from './pages/PmPage'
import { ScanPage } from './pages/ScanPage'
import { SettingsPage } from './pages/SettingsPage'
import { WorkDetailPage } from './pages/WorkDetailPage'
import { WorkFormPage } from './pages/WorkFormPage'
import { WorkListPage } from './pages/WorkListPage'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route element={<Frame />}>
          <Route index element={<HomePage />} />
          <Route path="assets" element={<AssetListPage />} />
          <Route path="assets/new" element={<AssetFormPage />} />
          <Route path="assets/:id/edit" element={<AssetFormPage />} />
          <Route path="a/:id" element={<AssetDetailPage />} />
          <Route path="work" element={<WorkListPage />} />
          <Route path="work/new" element={<WorkFormPage />} />
          <Route path="work/:id/edit" element={<WorkFormPage />} />
          <Route path="w/:id" element={<WorkDetailPage />} />
          <Route path="scan" element={<ScanPage />} />
          <Route path="labels" element={<LabelsPage />} />
          <Route path="pm" element={<PmPage />} />
          <Route path="pm/:id" element={<PmDetailPage />} />
          <Route path="parts" element={<PartsPage />} />
          <Route path="more" element={<MorePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function Frame() {
  const gate = useCmmsGate()
  if (!gate.ready) {
    return (
      <div className="boot">
        <div className="brand-mark">
          <Wrench />
        </div>
        <h1>Wrench</h1>
        <p>{gate.error ?? 'Opening the maintenance book…'}</p>
      </div>
    )
  }
  return <Shell />
}
