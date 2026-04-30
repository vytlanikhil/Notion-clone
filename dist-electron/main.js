import { BrowserWindow, app, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
//#region electron/db.ts
var db = new Database(path.join(app.getPath("userData"), "notion_clone.db"));
db.pragma("journal_mode = WAL");
var initSchema = () => {
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
  `);
};
initSchema();
var api = {
	getPages: () => {
		return db.prepare("SELECT * FROM pages ORDER BY created_at ASC").all();
	},
	createPage: (page) => {
		return db.prepare("INSERT INTO pages (id, title, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(page.id, page.title, page.parent_id, page.created_at, page.updated_at);
	},
	updatePage: (id, title, updated_at) => {
		return db.prepare("UPDATE pages SET title = ?, updated_at = ? WHERE id = ?").run(title, updated_at, id);
	},
	deletePage: (id) => {
		return db.prepare("DELETE FROM pages WHERE id = ?").run(id);
	},
	getBlocks: (page_id) => {
		return db.prepare("SELECT * FROM blocks WHERE page_id = ? ORDER BY position ASC").all();
	},
	saveBlocks: (page_id, blocks) => {
		const deleteStmt = db.prepare("DELETE FROM blocks WHERE page_id = ?");
		const insertStmt = db.prepare("INSERT INTO blocks (id, page_id, type, content, position, created_at) VALUES (?, ?, ?, ?, ?, ?)");
		return db.transaction((pageId, blocksToSave) => {
			deleteStmt.run(pageId);
			for (let i = 0; i < blocksToSave.length; i++) {
				const b = blocksToSave[i];
				insertStmt.run(b.id, pageId, b.type, b.content, i, b.created_at || Date.now());
			}
		})(page_id, blocks);
	}
};
//#endregion
//#region electron/main.ts
var __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
var VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
var MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
var RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
var win;
function createWindow() {
	win = new BrowserWindow({
		icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			nodeIntegration: true,
			contextIsolation: false
		}
	});
	win.webContents.on("did-finish-load", () => {
		win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
	});
	if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
	else win.loadFile(path.join(RENDERER_DIST, "index.html"));
}
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
		win = null;
	}
});
ipcMain.handle("get-pages", () => api.getPages());
ipcMain.handle("create-page", (_, page) => api.createPage(page));
ipcMain.handle("update-page", (_, id, title, updated_at) => api.updatePage(id, title, updated_at));
ipcMain.handle("delete-page", (_, id) => api.deletePage(id));
ipcMain.handle("get-blocks", (_, page_id) => api.getBlocks(page_id));
ipcMain.handle("save-blocks", (_, page_id, blocks) => api.saveBlocks(page_id, blocks));
app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.whenReady().then(createWindow);
//#endregion
export { MAIN_DIST, RENDERER_DIST, VITE_DEV_SERVER_URL };
