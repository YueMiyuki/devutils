# Task Completion Checklist

When completing a development task, follow these steps:

## Code Quality Checks

1. **ESLint**: Run `pnpm lint` to check for linting errors
   - Fix any errors or warnings
   - Ensure code follows project conventions

2. **Type Safety**: Verify TypeScript compilation
   - Run `pnpm check-types` to check types
   - Resolve any type errors (though build ignores them)

3. **Code Review**: Self-review changes
   - Check for console.log statements (remove debugging logs)
   - Verify component imports are correct
   - Ensure proper use of client/server components

## Testing

1. **Development Testing**:
   - Test in Next.js dev mode: `pnpm dev`
   - Test in Tauri dev mode: `pnpm tauri dev`
   - Verify functionality in both web and desktop contexts

2. **Build Testing**:
   - Ensure production build succeeds: `pnpm build`
   - Check that static export works correctly
   - Verify Tauri build: `pnpm tauri build`

## Integration Checks

1. **Tauri Integration**:
   - Verify assets load correctly (check assetPrefix config)
   - Test Tauri-specific features (if any)
   - Ensure desktop window behavior is correct

2. **Component Integration**:
   - Check all components render correctly
   - Verify responsive design works
   - Test theme switching (if implemented)

## Pre-Commit

1. **Git Status**: Run `git status` to review changes
2. **Git Diff**: Review actual code changes
3. **Commit**: Use descriptive commit messages
4. **No Build Artifacts**: Don't commit .next/, out/, node_modules/

## Notes

- TypeScript build errors are ignored during `next build` (per config)
- Next.js development server runs on port 3000
- Tauri uses static export from out/ directory
- Always test both web and desktop modes after changes
