import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { todayPacific } from '../domain/dates'
import type { AppSettings, Asset, AssetInput, CmmsSnapshot, WoPartInput, WoTask, WorkOrder, WorkOrderInput } from '../domain/types'
import { createIndexedDbRepository } from './indexeddb'
import type { CmmsRepository } from './repository'

interface ReadyCmms {
  ready: true
  error: null
  snapshot: CmmsSnapshot
  settings: AppSettings
  today: string
  saveAsset: (input: AssetInput) => Promise<Asset>
  saveWorkOrder: (input: WorkOrderInput, lines: WoPartInput[]) => Promise<WorkOrder>
  saveWoTasks: (woId: string, tasks: WoTask[]) => Promise<void>
  importWorkbook: (data: ArrayBuffer | Uint8Array) => Promise<{
    warnings: string[]
    assets: number
    workOrders: number
    parts: number
    pmSchedules: number
    pmTasks: number
    woTasks: number
  }>
  exportWorkbook: () => Promise<Blob>
  resetDemo: () => Promise<void>
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
}

interface LoadingCmms {
  ready: false
  error: string | null
}

type CmmsValue = ReadyCmms | LoadingCmms

const CmmsContext = createContext<CmmsValue>({ ready: false, error: null })

export function CmmsProvider({
  children,
  repository,
}: {
  children: ReactNode
  repository?: CmmsRepository
}) {
  const repo = useMemo(() => repository ?? createIndexedDbRepository(), [repository])
  const [value, setValue] = useState<CmmsValue>({ ready: false, error: null })

  useEffect(() => {
    let cancel = false
    void (async () => {
      try {
        const snapshot = await repo.load()
        const settings = await repo.getSettings()
        if (cancel) return
        setValue(buildValue(repo, snapshot, settings, setValue))
      } catch (error) {
        if (cancel) return
        const message = error instanceof Error ? error.message : 'The maintenance book could not be opened.'
        setValue({
          ready: false,
          error: /indexeddb|quota|storage/i.test(message)
            ? 'This browser blocked saving data on the phone. Turn off private browsing, or try another browser.'
            : message,
        })
      }
    })()
    return () => {
      cancel = true
    }
  }, [repo])

  return <CmmsContext.Provider value={value}>{children}</CmmsContext.Provider>
}

function buildValue(
  repo: CmmsRepository,
  snapshot: CmmsSnapshot,
  settings: AppSettings,
  setValue: (value: CmmsValue) => void,
): ReadyCmms {
  const publish = (nextSnapshot: CmmsSnapshot, nextSettings = settings) => {
    setValue(buildValue(repo, nextSnapshot, nextSettings, setValue))
  }
  return {
    ready: true,
    error: null,
    snapshot,
    settings,
    today: todayPacific(),
    async saveAsset(input) {
      const result = await repo.saveAsset(input)
      publish(result.snapshot)
      return result.asset
    },
    async saveWorkOrder(input, lines) {
      const result = await repo.saveWorkOrder(input, lines)
      publish(result.snapshot)
      return result.workOrder
    },
    async saveWoTasks(woId, tasks) {
      publish(await repo.saveWoTasks(woId, tasks))
    },
    async importWorkbook(data) {
      const result = await repo.importWorkbook(data)
      publish(result.snapshot)
      return {
        warnings: result.warnings,
        assets: result.snapshot.assets.length,
        workOrders: result.snapshot.workOrders.length,
        parts: result.snapshot.parts.length,
        pmSchedules: result.snapshot.pmSchedules.length,
        pmTasks: result.snapshot.pmTasks.length,
        woTasks: result.snapshot.woTasks.length,
      }
    },
    async exportWorkbook() {
      return repo.exportWorkbook()
    },
    async resetDemo() {
      publish(await repo.resetDemo())
    },
    async updateSettings(patch) {
      const next = { ...settings, ...patch }
      await repo.saveSettings(next)
      publish(snapshot, next)
    },
  }
}

export function useCmmsGate(): CmmsValue {
  return useContext(CmmsContext)
}

export function useCmms(): ReadyCmms {
  const value = useContext(CmmsContext)
  if (!value.ready) throw new Error('Maintenance data is not ready yet.')
  return value
}
