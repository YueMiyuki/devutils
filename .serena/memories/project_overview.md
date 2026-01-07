# DevUtils Project Overview

## Purpose

DevUtils is a developer utilities desktop application built with Next.js and Tauri. It provides a collection of developer tools with a modern UI featuring a sidebar navigation, tab management, and settings configuration.

## Tech Stack

- **Frontend**: Next.js 16 (App Router) with React 19.2
- **Desktop Framework**: Tauri 2
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (New York style) with Radix UI primitives
- **Icons**: Lucide React
- **State Management**: Zustand 5
- **Form Handling**: React Hook Form with Zod validation
- **Package Manager**: pnpm

## Project Structure

```
devutils/
├── app/                  # Next.js app router pages
│   ├── page.tsx         # Main application page
│   ├── layout.tsx       # Root layout
│   └── globals.css      # Global styles
├── components/          # React components
│   ├── ui/             # UI components
│   ├── tools/          # Tools
│   ├── tool-sidebar.tsx
│   ├── tab-bar.tsx
│   ├── tool-content.tsx
│   └── settings-dialog.tsx
├── lib/                # Utility functions
├── src-tauri/          # Tauri backend (Rust)
├── public/             # Static assets
└── Configuration files
```

## Key Configuration

- **Path Aliases**: `@/*` maps to project root
- **Output**: Static export for Tauri (`output: "export"`)
- **Images**: Unoptimized for SSG
- **Asset Prefix**: Dev mode uses `http://localhost:3000`
- **shadcn/ui**: New York style with CSS variables
