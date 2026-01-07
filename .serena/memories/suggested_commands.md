# Suggested Commands

## Development

```bash
# Start Next.js development server (port 3000)
pnpm dev

# Start Tauri development mode (desktop app with hot reload)
pnpm tauri dev

# Build Next.js for production (exports to out/)
pnpm build

# Build Tauri app for production
pnpm tauri build
```

## Code Quality

```bash
# Run ESLint
pnpm lint

# Type check (Note: TypeScript checking disabled during build)
pnpm check-types
```

## Package Management

```bash
# Install dependencies
pnpm install

# Add a dependency
pnpm add <package>

# Add a dev dependency
pnpm add -D <package>

# Update dependencies
pnpm update
```

## Tauri Commands

```bash
# Initialize Tauri (if needed)
pnpm tauri init

# Build for current platform
pnpm tauri build

# Build for specific platform
pnpm tauri build --target <target>

# Open Tauri dev tools
pnpm tauri dev --debug
```

## shadcn/ui Components

```bash
# Add a new shadcn/ui component
npx shadcn@latest add <component-name>
```

## Git Workflow

```bash
# Check status and current branch
git status && git branch

# Create feature branch
git checkout -b feature/name

# Stage and commit changes
git add .
git commit -m "description"
```

## System Commands (Darwin/macOS)

- `ls -la` - list files with details
- `grep -r "pattern" .` - search in files
- `find . -name "pattern"` - find files by name
- `open .` - open current directory in Finder
