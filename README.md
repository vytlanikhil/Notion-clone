# Notion Clone

A powerful, local-first knowledge management application inspired by Notion. Built with React, Vite, and Electron, it provides a seamless, distraction-free environment for taking notes, organizing thoughts, and managing knowledge.

## 🚀 Features

- **Rich Text Editor:** A fully customizable, block-based rich text editor powered by Tiptap.
- **Versatile Export Options:** 
  - **Export to PDF:** Save your documents as formatted PDFs (`html2pdf.js`).
  - **Export to Markdown (MD):** Easily export your pages to Markdown format (`turndown`).
  - **Export to CSV:** Export table data or structured text to CSV.
- **Intuitive Interactions:**
  - **Drag and Drop:** Reorder pages, lists, and content blocks seamlessly using `@dnd-kit`.
  - **Copy & Paste:** Full support for copying and pasting rich text and external content directly into the editor.
- **Local-First & Offline:** Your data never leaves your machine. Fast, secure offline storage powered by `better-sqlite3`.
- **Beautiful UI:** Polished, responsive design utilizing Tailwind CSS and smooth animations via Framer Motion.

## 💻 Tech Stack & Specifications

- **Version:** `0.0.0`
- **Core Frameworks:** React `^19.2.5`, Vite `^8.0.10`, TypeScript
- **Desktop Environment:** Electron `^41.3.0`
- **Editor Engine:** Tiptap `^3.22.5`
- **State Management:** Zustand `^5.0.12`
- **Database:** Better-SQLite3 `^12.9.0`
- **Styling & Animation:** Tailwind CSS `^4.2.4`, Framer Motion `^12.38.0`, Lucide React (Icons)
