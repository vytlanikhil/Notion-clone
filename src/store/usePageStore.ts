import { create } from 'zustand'

export interface Page {
  id: string
  title: string
  parent_id: string | null
  created_at: number
  updated_at: number
}

export interface Block {
  id: string
  page_id: string
  type: string
  content: string
  position: number
  created_at: number
}

interface PageState {
  pages: Page[]
  activePageId: string | null
  blocks: Block[]
  isLoading: boolean
  
  // Actions
  fetchPages: () => Promise<void>
  createPage: (title?: string, parent_id?: string | null) => Promise<string>
  updatePage: (id: string, title: string) => Promise<void>
  deletePage: (id: string) => Promise<void>
  setActivePage: (id: string | null) => void
  fetchBlocks: (page_id: string) => Promise<void>
  saveBlocks: (page_id: string, blocks: Omit<Block, 'position'>[]) => Promise<void>
}

// Ensure ipcRenderer is available
const ipcRenderer = (window as any).ipcRenderer || {
  invoke: async (channel: string, ...args: any[]) => {
    // Web Browser Fallback using LocalStorage
    console.log(`[Browser Mode] Mocking IPC Call: ${channel}`, args)
    
    if (channel === 'get-pages') {
      return JSON.parse(localStorage.getItem('mock_db_pages') || '[]')
    }
    
    if (channel === 'create-page') {
      const [newPage] = args
      const pages = JSON.parse(localStorage.getItem('mock_db_pages') || '[]')
      pages.push(newPage)
      localStorage.setItem('mock_db_pages', JSON.stringify(pages))
      return newPage.id
    }
    
    if (channel === 'update-page') {
      const [id, title, updated_at] = args
      const pages = JSON.parse(localStorage.getItem('mock_db_pages') || '[]')
      const newPages = pages.map((p: any) => p.id === id ? { ...p, title, updated_at } : p)
      localStorage.setItem('mock_db_pages', JSON.stringify(newPages))
      return
    }
    
    if (channel === 'delete-page') {
      const [id] = args
      const pages = JSON.parse(localStorage.getItem('mock_db_pages') || '[]')
      localStorage.setItem('mock_db_pages', JSON.stringify(pages.filter((p: any) => p.id !== id)))
      
      // Also delete blocks for this page
      const allBlocks = JSON.parse(localStorage.getItem('mock_db_blocks') || '{}')
      delete allBlocks[id]
      localStorage.setItem('mock_db_blocks', JSON.stringify(allBlocks))
      return
    }
    
    if (channel === 'get-blocks') {
      const [page_id] = args
      const allBlocks = JSON.parse(localStorage.getItem('mock_db_blocks') || '{}')
      return allBlocks[page_id] || []
    }
    
    if (channel === 'save-blocks') {
      const [page_id, blocksToSave] = args
      const allBlocks = JSON.parse(localStorage.getItem('mock_db_blocks') || '{}')
      allBlocks[page_id] = blocksToSave
      localStorage.setItem('mock_db_blocks', JSON.stringify(allBlocks))
      return
    }
    
    return []
  },
}

export const usePageStore = create<PageState>((set, get) => ({
  pages: [],
  activePageId: null,
  blocks: [],
  isLoading: false,

  fetchPages: async () => {
    set({ isLoading: true })
    try {
      const pages = await ipcRenderer.invoke('get-pages')
      set({ pages })
      
      const lastActive = localStorage.getItem('lastActivePageId')
      const currentActive = get().activePageId
      if (!currentActive && pages.length > 0) {
        const pageToSelect = pages.find((p: Page) => p.id === lastActive) || pages[0]
        get().setActivePage(pageToSelect.id)
      }
    } catch (error) {
      console.error('Failed to fetch pages', error)
    } finally {
      set({ isLoading: false })
    }
  },

  createPage: async (title = 'Untitled', parent_id = null) => {
    const newPage: Page = {
      id: crypto.randomUUID(),
      title,
      parent_id,
      created_at: Date.now(),
      updated_at: Date.now(),
    }
    
    try {
      await ipcRenderer.invoke('create-page', newPage)
      set((state) => ({ pages: [...state.pages, newPage] }))
      get().setActivePage(newPage.id)
      return newPage.id
    } catch (error) {
      console.error('Failed to create page', error)
      throw error
    }
  },

  updatePage: async (id: string, title: string) => {
    try {
      const updated_at = Date.now()
      await ipcRenderer.invoke('update-page', id, title, updated_at)
      set((state) => ({
        pages: state.pages.map((p) => (p.id === id ? { ...p, title, updated_at } : p)),
      }))
    } catch (error) {
      console.error('Failed to update page', error)
    }
  },

  deletePage: async (id: string) => {
    try {
      await ipcRenderer.invoke('delete-page', id)
      set((state) => {
        const newPages = state.pages.filter((p) => p.id !== id)
        const newActiveId = state.activePageId === id ? (newPages[0]?.id || null) : state.activePageId
        if (state.activePageId === id) {
           get().setActivePage(newActiveId)
        }
        return {
          pages: newPages,
        }
      })
    } catch (error) {
      console.error('Failed to delete page', error)
    }
  },

  setActivePage: (id: string | null) => {
    set({ activePageId: id })
    if (id) {
      localStorage.setItem('lastActivePageId', id)
      get().fetchBlocks(id)
    } else {
      localStorage.removeItem('lastActivePageId')
      set({ blocks: [] })
    }
  },

  fetchBlocks: async (page_id: string) => {
    set({ isLoading: true })
    try {
      const blocks = await ipcRenderer.invoke('get-blocks', page_id)
      set({ blocks })
    } catch (error) {
      console.error('Failed to fetch blocks', error)
    } finally {
      set({ isLoading: false })
    }
  },

  saveBlocks: async (page_id: string, blocksToSave: Omit<Block, 'position'>[]) => {
    try {
      await ipcRenderer.invoke('save-blocks', page_id, blocksToSave)
      // Optimistic UI update or skip since we just saved
    } catch (error) {
      console.error('Failed to save blocks', error)
    }
  },
}))
