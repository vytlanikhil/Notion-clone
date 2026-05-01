import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Image from '@tiptap/extension-image'
import CodeBlock from '@tiptap/extension-code-block'
import Dropcursor from '@tiptap/extension-dropcursor'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { usePageStore } from '../store/usePageStore'
import { Download, MoreHorizontal, Save, Check } from 'lucide-react'
import html2pdf from 'html2pdf.js'
import TurndownService from 'turndown'

function debounceFn<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeoutId: any
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

export const Editor: React.FC = () => {
  const { activePageId, blocks, saveBlocks, pages, updatePage } = usePageStore()
  const [showExport, setShowExport] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...' | 'Unsaved changes'>('Saved')
  const exportMenuRef = useRef<HTMLDivElement>(null)
  
  // Use refs for values needed in editor callbacks to avoid stale closures
  const activePageIdRef = useRef(activePageId)
  const saveBlocksRef = useRef(saveBlocks)
  
  useEffect(() => {
    activePageIdRef.current = activePageId
    saveBlocksRef.current = saveBlocks
  }, [activePageId, saveBlocks])

  const activePage = pages.find((p) => p.id === activePageId)

  const forceSaveWithEditor = useCallback(async (currentEditor: any) => {
    const currentId = activePageIdRef.current
    if (!currentId || !currentEditor) return
    
    setSaveStatus('Saving...')
    
    const json = currentEditor.getJSON()
    const contentBlocks = json.content || []
    
    const blocksToSave = contentBlocks.map((block: any) => ({
      id: crypto.randomUUID(),
      page_id: currentId,
      type: block.type,
      content: JSON.stringify(block),
      created_at: Date.now()
    }))
    
    await saveBlocksRef.current(currentId, blocksToSave)
    setSaveStatus('Saved')
  }, [])

  // Debounced save defined before editor initialization
  const handleSave = useCallback(
    debounceFn((currentEditor: any) => {
      forceSaveWithEditor(currentEditor)
    }, 500),
    [forceSaveWithEditor]
  )

  // Setup the editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image,
      CodeBlock,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Dropcursor.configure({
        color: 'var(--foreground)',
        width: 2,
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setSaveStatus('Unsaved changes')
      handleSave(editor)
    },
    onBlur: ({ editor }) => {
      // Force an immediate save on blur
      forceSaveWithEditor(editor)
    },
    editorProps: {
      handleDrop: function(view, event, slice, moved) {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0]
          if (file.type.includes('image/')) {
            event.preventDefault()
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = function () {
              const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })
              if (!coordinates) return
              const node = view.state.schema.nodes.image.create({ src: reader.result as string })
              const transaction = view.state.tr.insert(coordinates.pos, node)
              view.dispatch(transaction)
            }
            return true
          }
        }
        return false
      },
      handlePaste: function(view, event, slice) {
        const items = event.clipboardData?.items
        if (items) {
          for (const item of Array.from(items)) {
            if (item.type.indexOf('image') === 0) {
              event.preventDefault()
              const file = item.getAsFile()
              if (file) {
                const reader = new FileReader()
                reader.readAsDataURL(file)
                reader.onload = function () {
                  const node = view.state.schema.nodes.image.create({ src: reader.result as string })
                  const transaction = view.state.tr.replaceSelectionWith(node)
                  view.dispatch(transaction)
                }
                return true
              }
            }
          }
        }
        return false
      }
    }
  })

  // Keyboard shortcut for saving (Ctrl+S or Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (editor) {
          forceSaveWithEditor(editor)
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editor, forceSaveWithEditor])

  // Load content when active page changes
  useEffect(() => {
    if (editor && activePageId) {
      // Reconstruct document from blocks
      const doc = {
        type: 'doc',
        content: blocks.map((b) => JSON.parse(b.content))
      }
      editor.commands.setContent(doc, { emitUpdate: false })
    } else if (editor) {
      editor.commands.setContent('', { emitUpdate: false })
    }
  }, [activePageId, blocks, editor])

  // Click outside to close export menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExport(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExport = (format: 'html' | 'json' | 'pdf' | 'md') => {
    if (!editor || !activePage) return
    
    setShowExport(false)
    const title = activePage.title || 'Untitled'

    if (format === 'html') {
      const html = editor.getHTML()
      const blob = new Blob([`<html><head><title>${title}</title><style>body{font-family:sans-serif;padding:2rem}</style></head><body><h1>${title}</h1>${html}</body></html>`], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}.html`
      a.click()
    } else if (format === 'json') {
      const json = editor.getJSON()
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}.json`
      a.click()
    } else if (format === 'md') {
      const turndownService = new TurndownService()
      const markdown = turndownService.turndown(editor.getHTML())
      const blob = new Blob([`# ${title}\n\n${markdown}`], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}.md`
      a.click()
    } else if (format === 'pdf') {
      const element = document.createElement('div')
      element.innerHTML = `<h1 style="font-family:sans-serif;margin-bottom:1rem">${title}</h1><div style="font-family:sans-serif">${editor.getHTML()}</div>`
      html2pdf().from(element).set({
        margin: 15,
        filename: `${title}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).save()
    }
  }

  if (!activePageId) {
    return (
      <div className="flex-1 flex items-center justify-center text-foreground-muted h-full bg-background font-sans">
        Select a page or create a new one
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative font-sans">
      {/* Top Bar */}
      <div className="h-12 flex items-center justify-between px-4 sticky top-0 bg-background/90 backdrop-blur-md z-10">
        <div className="text-[14px] text-foreground-muted flex items-center gap-2">
          <span className="hover:text-foreground cursor-pointer transition-colors px-1 rounded hover:bg-hover">Private</span>
          <span>/</span>
          <span className="text-foreground font-medium px-1 rounded">{activePage?.title || 'Untitled'}</span>
        </div>
        
        <div className="relative flex items-center gap-2" ref={exportMenuRef}>
          {/* Status Indicator */}
          <div className="text-xs text-foreground-muted mr-2 flex items-center min-w-[80px] justify-end">
            {saveStatus === 'Saving...' && <span>Saving...</span>}
            {saveStatus === 'Saved' && <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Saved</span>}
            {saveStatus === 'Unsaved changes' && <span className="italic">Unsaved changes</span>}
          </div>

          {/* Manual Save Button */}
          <button 
            onClick={() => editor && forceSaveWithEditor(editor)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[14px] font-medium rounded-md hover:bg-hover text-foreground-muted hover:text-foreground transition-colors duration-150"
            title="Save (Ctrl+S)"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>

          <button className="p-1.5 rounded-md hover:bg-hover text-foreground-muted hover:text-foreground transition-colors duration-150">
            <MoreHorizontal className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => setShowExport(!showExport)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[14px] font-medium rounded-md hover:bg-hover text-foreground-muted hover:text-foreground transition-colors duration-150"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          
          {showExport && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-popover border border-border rounded-lg shadow-xl py-1.5 z-50 overflow-hidden text-[14px]">
              <div className="px-3 py-1.5 text-xs font-semibold text-foreground-muted mb-1 uppercase tracking-wider">Export As</div>
              <button onClick={() => handleExport('md')} className="w-full text-left px-3 py-1.5 hover:bg-hover text-foreground transition-colors duration-150">Markdown</button>
              <button onClick={() => handleExport('html')} className="w-full text-left px-3 py-1.5 hover:bg-hover text-foreground transition-colors duration-150">HTML</button>
              <button onClick={() => handleExport('pdf')} className="w-full text-left px-3 py-1.5 hover:bg-hover text-foreground transition-colors duration-150">PDF</button>
              <div className="h-[1px] bg-border my-1 mx-2" />
              <button onClick={() => handleExport('json')} className="w-full text-left px-3 py-1.5 hover:bg-hover text-foreground transition-colors duration-150">JSON (Raw)</button>
            </div>
          )}
        </div>
      </div>
      
      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto px-12 py-12 lg:px-24 max-w-4xl mx-auto w-full">
        {/* Page Title */}
        <input
          value={activePage?.title || ''}
          onChange={(e) => {
            if (activePageId) updatePage(activePageId, e.target.value)
          }}
          placeholder="Untitled"
          className="text-[40px] font-bold bg-transparent border-none outline-none w-full mb-6 text-foreground placeholder:text-foreground-muted placeholder:opacity-50"
        />
        
        {/* TipTap Editor */}
        <EditorContent editor={editor} className="w-full" />
      </div>
    </div>
  )
}
