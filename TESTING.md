# Testing, Formatting, and Linting

This project uses **Vitest** for testing, **Prettier** for code formatting, and **ESLint** for linting.

## Available Scripts

### Testing

- `bun run test` - Run tests in watch mode
- `bun run test:run` - Run tests once
- `bun run test:ui` - Run tests with interactive UI
- `bun run test:coverage` - Run tests with coverage report

### Linting

- `bun run lint` - Check for linting errors
- `bun run lint:fix` - Automatically fix linting errors

### Formatting

- `bun run format` - Format all TypeScript and CSS files
- `bun run format:check` - Check if files are formatted correctly

## Configuration Files

- `.prettierrc` - Prettier configuration
- `.prettierignore` - Files to ignore for formatting
- `eslint.config.js` - ESLint configuration (flat config format)
- `vitest.config.ts` - Vitest configuration

## Running All Checks

Before committing, run:

```bash
bun run type-check
bun run lint
bun run format:check
bun run test:run
```

## Writing Tests

Tests are located in `src/__tests__/` directory. Example:

```typescript
import { describe, it, expect } from 'vitest';

describe('My Feature', () => {
  it('should work correctly', () => {
    expect(true).toBe(true);
  });
});
```

## Notes

- Handlebars templates (`.hbs`) are excluded from Prettier formatting due to partial syntax limitations
- ESLint warnings about `any` types are non-blocking but should be addressed when possible
- Tests use `happy-dom` for DOM environment simulation
