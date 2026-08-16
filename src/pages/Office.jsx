import { Suspense } from 'react'
import JellyBlob from '../components/3d/JellyBlob'

function LoadingFallback() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0a0e27',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#6366ff',
      fontFamily: 'monospace'
    }}>
      Loading Jelly Blob...
    </div>
  )
}

export default function Office() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, overflow: 'hidden' }}>
        <JellyBlob scale={1} />
      </div>
    </Suspense>
  )
}
