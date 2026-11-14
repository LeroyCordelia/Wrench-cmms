import type { PmTask, WoTask } from './domain/types'

type Step = WoTask | PmTask

function responseOf(step: Step): string | null {
  return 'response' in step ? step.response : null
}

function checked(step: Step): boolean {
  const value = (responseOf(step) ?? '').trim().toLowerCase()
  return value === '1' || value === 'yes' || value === 'true' || value === 'done'
}

export function Checklist({
  steps,
  editable,
  onResponse,
}: {
  steps: Step[]
  editable: boolean
  onResponse?: (index: number, response: string | null) => void
}) {
  if (steps.length === 0) return <p className="card">No checklist on this record.</p>
  const checks = steps.filter((step) => step.step_type === 'checkbox' || step.step_type === 'photo')
  const done = checks.filter(checked).length
  return (
    <div className="stack">
      {checks.length > 0 && (
        <p className="muted">
          {done} of {checks.length} checks done
        </p>
      )}
      {steps.map((step, index) => {
        const level = step.level ?? 0
        return (
          <article key={`${step.step_no}-${index}`} className={`card step ${checked(step) ? 'step-done' : ''}`} style={{ marginLeft: level * 14 }}>
            <p className="muted">
              {step.step_no ?? index + 1}. {step.step_type ?? 'step'}
            </p>
            <p className="prose">{step.instruction || '—'}</p>
            <StepAnswer step={step} editable={editable} onResponse={(response) => onResponse?.(index, response)} />
          </article>
        )
      })}
    </div>
  )
}

function StepAnswer({
  step,
  editable,
  onResponse,
}: {
  step: Step
  editable: boolean
  onResponse: (response: string | null) => void
}) {
  const response = responseOf(step) ?? ''
  const type = step.step_type ?? 'note'
  if (type === 'note') return null
  if (type === 'checkbox' || type === 'photo') {
    return (
      <label className="check-row">
        <input
          type="checkbox"
          checked={checked(step)}
          disabled={!editable}
          onChange={(event) => onResponse(event.target.checked ? '1' : '0')}
        />
        <span>{type === 'photo' ? 'Photo taken' : 'Done'}</span>
      </label>
    )
  }
  if (type === 'option list') {
    const options = (step.options ?? '').split('|').map((option) => option.trim()).filter(Boolean)
    return (
      <label className="field">
        <span>Answer</span>
        <select value={response} disabled={!editable} onChange={(event) => onResponse(event.target.value || null)}>
          <option value="">Choose</option>
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
    )
  }
  return (
    <label className="field">
      <span>{type === 'number' ? 'Number' : 'Answer'}</span>
      <input
        defaultValue={response}
        inputMode={type === 'number' ? 'decimal' : 'text'}
        disabled={!editable}
        onBlur={(event) => {
          const next = event.target.value.trim()
          if (next !== response) onResponse(next || null)
        }}
      />
    </label>
  )
}
