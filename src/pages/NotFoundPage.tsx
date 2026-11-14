import { usePageMeta } from '../Shell'
import { MissingRecord } from '../ui'

export function NotFoundPage() {
  usePageMeta('Not found')
  return (
    <MissingRecord
      title="That page is not in Wrench"
      body="Check the address. Asset labels use /a/ and a work order uses /w/, followed by the ID."
    />
  )
}
