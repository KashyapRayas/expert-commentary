import { lazy, Suspense } from 'react'
import BookFan from './BookFan.jsx'
import ExpertCommentary from './ExpertCommentary.jsx'

// The WebGL viewer built earlier is still here, behind ?3d, so the orbitable
// version stays available without loading three.js for the section.
const Viewer3D = lazy(() => import('./Viewer3D.jsx'))

export default function App() {
  const params = new URLSearchParams(window.location.search)

  if (params.has('3d')) {
    return (
      <Suspense fallback={null}>
        <Viewer3D />
      </Suspense>
    )
  }

  // ?fan renders the panel on its own, filling the viewport — handy for
  // exporting a still at the frame's 676 x 326 without the surrounding section.
  if (params.has('fan')) {
    return (
      <div style={{ height: '100vh' }}>
        <BookFan />
      </div>
    )
  }

  return <ExpertCommentary />
}
