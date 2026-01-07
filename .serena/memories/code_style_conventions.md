# Code Style and Conventions

## TypeScript Configuration

- **Target**: ES2017
- **Strict Mode**: Enabled
- **Module System**: ESNext with bundler resolution
- **JSX**: react-jsx (automatic runtime)
- **Path Aliases**: `@/*` for imports from root

## Code Style

- **Components**: Functional components with hooks
- **Client Components**: Use `"use client"` directive when needed
- **Naming Conventions**:
  - Components: PascalCase (e.g., `ToolSidebar`)
  - Files: kebab-case for components (e.g., `tool-sidebar.tsx`)
  - Functions: camelCase
- **Import Order**: React imports first, then components, then utilities

## Component Patterns

- Use shadcn/ui components from `@/components/ui`
- State management with useState and Zustand where appropriate
- Form handling with react-hook-form and zod validation
- Use Lucide icons for consistency

## Styling

- **Tailwind CSS**: Use utility classes
- **CSS Variables**: For theming (defined in globals.css)
- **Class Composition**: Use `cn()` utility from lib/utils
- **Responsive Design**: Mobile-first approach

## File Organization

- Components in `components/` directory
- UI primitives in `components/ui/`
- Utilities in `lib/`
- Pages in `app/` directory (App Router)
- Types can be co-located or in separate `.d.ts` files
