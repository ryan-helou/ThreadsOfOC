import { useState } from 'react'
import { useStore } from './store/store.tsx'
import { Login } from './components/Login.tsx'
import { TopNav, type Tab } from './components/TopNav.tsx'
import { GalleryView } from './components/GalleryView.tsx'
import { GridView } from './components/GridView.tsx'
import { SalesView } from './components/SalesView.tsx'
import { Toasts } from './components/Toasts.tsx'

export default function App() {
  const { isAuthed } = useStore()
  const [tab, setTab] = useState<Tab>('gallery')

  if (!isAuthed) {
    return (
      <>
        <Login />
        <Toasts />
      </>
    )
  }

  return (
    <div className="min-h-screen">
      <TopNav active={tab} onChange={setTab} />
      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === 'gallery' && <GalleryView />}
        {tab === 'grid' && <GridView />}
        {tab === 'sales' && <SalesView />}
      </main>
      <Toasts />
    </div>
  )
}
