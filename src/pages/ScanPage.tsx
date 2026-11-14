import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { parseScan } from '../domain/qr'
import { usePageMeta } from '../Shell'

export function ScanPage() {
  usePageMeta('Scan QR')
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const onCode = useRef<(text: string) => void>(() => {})
  const [active, setActive] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [manual, setManual] = useState('')

  useEffect(() => {
    onCode.current = (text: string) => {
      const parsed = parseScan(text)
      if (!parsed) {
        setMessage(`That code is not a Wrench label. It reads “${text.slice(0, 80)}”.`)
        return
      }
      setActive(false)
      navigate(parsed.kind === 'asset' ? `/a/${parsed.id}` : `/w/${parsed.id}`)
    }
  }, [navigate])

  useEffect(() => {
    if (!active) return
    const video = videoRef.current
    if (!video) return
    const preview = video
    let stopped = false
    let zxingStop: { stop: () => void } | null = null

    const stopStream = () => {
      const stream = preview.srcObject
      if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop())
      preview.srcObject = null
    }

    async function run() {
      try {
        if (window.BarcodeDetector) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: 'environment' } },
          })
          if (stopped) {
            stream.getTracks().forEach((track) => track.stop())
            return
          }
          preview.srcObject = stream
          await preview.play()
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
          const tick = async () => {
            if (stopped) return
            try {
              const codes = await detector.detect(preview)
              const raw = codes[0]?.rawValue
              if (raw) onCode.current(raw)
            } catch {
              // A frame can fail while the camera is still starting.
            }
            if (!stopped) requestAnimationFrame(() => void tick())
          }
          void tick()
          return
        }
        const { BrowserQRCodeReader } = await import('@zxing/browser')
        if (stopped) return
        const reader = new BrowserQRCodeReader()
        const controls = await reader.decodeFromVideoDevice(undefined, preview, (result) => {
          if (result) onCode.current(result.getText())
        })
        zxingStop = controls
        if (stopped) controls.stop()
      } catch (caught) {
        if (stopped) return
        setActive(false)
        const name = caught instanceof DOMException ? caught.name : ''
        if (name === 'NotAllowedError') {
          setMessage('The browser did not allow the camera. You can type the ID instead, or allow the camera in the browser settings.')
        } else if (name === 'NotFoundError') {
          setMessage('No camera was found on this device. Type the ID from the label.')
        } else {
          setMessage('The camera did not start. Type the ID from the label.')
        }
      }
    }

    void run()
    return () => {
      stopped = true
      zxingStop?.stop()
      stopStream()
    }
  }, [active])

  function submitManual(event: React.FormEvent) {
    event.preventDefault()
    const parsed = parseScan(manual)
    if (!parsed) {
      setMessage('Type an asset ID like AST-0002 or a work order ID like WO-000001.')
      return
    }
    navigate(parsed.kind === 'asset' ? `/a/${parsed.id}` : `/w/${parsed.id}`)
  }

  return (
    <>
      <div className="viewfinder">
        <video ref={videoRef} muted playsInline style={{ display: active ? 'block' : 'none' }} />
        {!active && (
          <div className="idle">
            <Camera size={42} />
            <p>Point the camera at a Wrench label.</p>
          </div>
        )}
        <div className="brackets" />
      </div>
      {!active && (
        <button className="btn btn-primary btn-block" type="button" style={{ marginTop: 12 }} onClick={() => { setMessage(null); setActive(true) }}>
          Start camera
        </button>
      )}
      {active && (
        <button className="btn btn-ghost btn-block" type="button" style={{ marginTop: 12 }} onClick={() => setActive(false)}>
          Stop camera
        </button>
      )}
      {message && <p className="form-error" style={{ marginTop: 12 }}>{message}</p>}
      <form onSubmit={submitManual} style={{ marginTop: 16 }}>
        <label className="field">
          <span>Or type the ID</span>
          <input
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            placeholder="AST-0002 or WO-000001"
            autoCapitalize="characters"
          />
        </label>
        <button className="btn btn-ghost btn-block" type="submit" style={{ marginTop: 8 }}>
          Open
        </button>
      </form>
    </>
  )
}
