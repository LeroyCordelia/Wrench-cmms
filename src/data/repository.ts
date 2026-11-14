import type { AppSettings, Asset, AssetInput, CmmsSnapshot, WoPartInput, WorkOrder, WorkOrderInput } from '../domain/types'

/**
 * The only data API the screens use.
 *
 * Phase 1 stores the workbook on this phone (IndexedDB) and moves it in and out
 * as .xlsx. A later Microsoft Graph adapter, or a Postgres/Supabase adapter,
 * implements this same interface. Screens should not import IndexedDB, SheetJS,
 * or a future database client.
 *
 * IDs and column names match the Excel contract so an Ignition app can share them.
 * Settings (QR base address, who is holding the phone) stay on the device.
 */
export interface CmmsRepository {
  load(): Promise<CmmsSnapshot>
  getSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<void>
  saveAsset(input: AssetInput): Promise<{ snapshot: CmmsSnapshot; asset: Asset }>
  saveWorkOrder(
    input: WorkOrderInput,
    lines: WoPartInput[],
  ): Promise<{ snapshot: CmmsSnapshot; workOrder: WorkOrder }>
  importWorkbook(data: ArrayBuffer | Uint8Array): Promise<{ snapshot: CmmsSnapshot; warnings: string[] }>
  exportWorkbook(): Promise<Blob>
  resetDemo(): Promise<CmmsSnapshot>
}
