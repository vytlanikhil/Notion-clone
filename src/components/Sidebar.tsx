import React, { useEffect, useState } from 'react'
import { Plus, FileText, Trash2, Edit2, Search } from 'lucide-react'
import { usePageStore } from '../store/usePageStore'
import clsx from 'clsx'

export const Sidebar: React.FC = () => {
  const { pages, fetchPages, createPage, setActivePage, activePageId, deletePage, updatePage } = usePageStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    fetchPages()
  }, [fetchPages])

  const handleCreate = async () => {
    await createPage()
  }

  const startEdit = (id: string, currentTitle: string) => {
    setEditingId(id)
    setEditTitle(currentTitle)
  }

  const saveEdit = async (id: string) => {
    if (editTitle.trim()) {
      await updatePage(id, editTitle)
    }
    setEditingId(null)
  }

  return (
    <div className="w-64 bg-sidebar border-r border-border h-screen flex flex-col font-sans transition-colors duration-200">
      {/* Workspace Header */}
      <div className="p-4 flex items-center justify-between hover:bg-hover cursor-pointer transition-colors duration-150">
        <span className="font-semibold text-sm flex items-center gap-2 text-foreground">
          <div className="w-5 h-5 bg-foreground text-background rounded flex items-center justify-center text-[10px] font-bold">N</div>
          Notion Clone
        </span>
      </div>
      
      {/* Search Button */}
      <div className="px-3 pb-4">
        <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-hover text-foreground-muted hover:text-foreground transition-colors duration-150 font-medium">
          <Search className="w-4 h-4" />
          Search
        </button>
      </div>

      {/* Pages List */}
      <div className="flex-1 overflow-y-auto space-y-0.5 px-3">
        <div className="group flex items-center justify-between px-2 py-1 mb-1">
          <span className="text-[11px] font-semibold text-foreground-muted tracking-wider">PRIVATE</span>
          <button 
            onClick={handleCreate}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-hover text-foreground-muted hover:text-foreground transition-all duration-150"
            title="Add a page"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        
        {pages.map((page) => (
          <div
            key={page.id}
            onClick={() => setActivePage(page.id)}
            className={clsx(
              'group flex items-center justify-between px-2 py-1 rounded-md cursor-pointer text-[14px] transition-colors duration-150 min-h-[30px]',
              activePageId === page.id ? 'bg-active font-medium text-foreground' : 'hover:bg-hover text-foreground-muted hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-2 overflow-hidden flex-1">
              <FileText className="w-4 h-4 flex-shrink-0 opacity-70" />
              {editingId === page.id ? (
                <input
                  autoFocus
                  className="bg-transparent border-none outline-none w-full flex-1 min-w-0 text-foreground font-medium"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => saveEdit(page.id)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit(page.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate flex-1 py-0.5">{page.title}</span>
              )}
            </div>
            
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <button
                onClick={(e) => { e.stopPropagation(); startEdit(page.id, page.title) }}
                className="p-1 rounded hover:bg-active text-foreground-muted hover:text-foreground transition-colors"
                title="Rename"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deletePage(page.id) }}
                className="p-1 rounded hover:bg-active text-foreground-muted hover:text-destructive transition-colors ml-0.5"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Add Button */}
      <div className="p-3">
        <button
          onClick={handleCreate}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-hover transition-colors duration-150 font-medium text-foreground-muted hover:text-foreground"
        >
          <Plus className="w-4 h-4" />
          New Page
        </button>
      </div>
    </div>
  )
}
