import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

// Route BEFORE any imports — public pages don't load CRM code at all
const hash = window.location.hash
const isNutrition = hash.startsWith('#nutrition')
const isBooking = hash === '#book'

let RootComponent
if (isNutrition) {
  const NutritionPublic = lazy(() => import('./pages/NutritionPublic.jsx'))
  RootComponent = () => <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#FAFAF8',fontFamily:'system-ui'}}><h1>BODY<em style={{color:'#B8860B',fontStyle:'normal'}}>FIT</em></h1></div>}><NutritionPublic /></Suspense>
} else if (isBooking) {
  // BookingPublic needs index.css for its styles
  import('./index.css')
  const BookingPublic = lazy(() => import('./pages/BookingPublic.jsx'))
  RootComponent = () => <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F5F3EF',fontFamily:'system-ui'}}><h1>BODY<em style={{color:'#2C2C2C',fontStyle:'normal'}}>FIT</em></h1></div>}><BookingPublic /></Suspense>
} else {
  import('./index.css')
  const App = lazy(() => import('./App.jsx'))
  RootComponent = () => <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F5F3EF',fontFamily:'system-ui'}}><h1>BODY<em style={{color:'#2C2C2C',fontStyle:'normal'}}>FIT</em></h1></div>}><App /></Suspense>
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>,
)
