import Database from 'better-sqlite3'
import path from 'node:path'
import { app } from 'electron'

// Define the path for the SQLite database
const dbPath = path.join(app.getPath('userData'), 'notion_clone.db')

// Initialize the database
const db = new Database(dbPath)
db.pragma('journal_mode = WAL') // Write-Ahead Logging for better concurrency

// Initialize the schema
const initSchema = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      parent_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES pages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS blocks (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT,
      position INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
    );
  `)
}

initSchema()

// DB API
export const api = {
  getPages: () => {
    return db.prepare('SELECT * FROM pages ORDER BY created_at ASC').all()
  },
  createPage: (page: { id: string; title: string; parent_id: string | null; created_at: number; updated_at: number }) => {
    const stmt = db.prepare('INSERT INTO pages (id, title, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    return stmt.run(page.id, page.title, page.parent_id, page.created_at, page.updated_at)
  },
  updatePage: (id: string, title: string, updated_at: number) => {
    const stmt = db.prepare('UPDATE pages SET title = ?, updated_at = ? WHERE id = ?')
    return stmt.run(title, updated_at, id)
  },
  deletePage: (id: string) => {
    const stmt = db.prepare('DELETE FROM pages WHERE id = ?')
    return stmt.run(id)
  },
  getBlocks: (page_id: string) => {
    return db.prepare('SELECT * FROM blocks WHERE page_id = ? ORDER BY position ASC').all()
  },
  saveBlocks: (page_id: string, blocks: any[]) => {
    const deleteStmt = db.prepare('DELETE FROM blocks WHERE page_id = ?')
    const insertStmt = db.prepare('INSERT INTO blocks (id, page_id, type, content, position, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    
    const transaction = db.transaction((pageId, blocksToSave) => {
      deleteStmt.run(pageId)
      for (let i = 0; i < blocksToSave.length; i++) {
        const b = blocksToSave[i]
        insertStmt.run(b.id, pageId, b.type, b.content, i, b.created_at || Date.now())
      }
    })
    
    return transaction(page_id, blocks)
  }
}
