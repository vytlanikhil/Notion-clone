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
  invoke: async () => [],
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
      set((state) => ({ pages: [...state.pages, newPage], activePageId: newPage.id }))
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
      set((state) => ({
        pages: state.pages.filter((p) => p.id !== id),
        activePageId: state.activePageId === id ? null : state.activePageId,
      }))
    } catch (error) {
      console.error('Failed to delete page', error)
    }
  },

  setActivePage: (id: string | null) => {
    set({ activePageId: id })
    if (id) {
      get().fetchBlocks(id)
    } else {
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
