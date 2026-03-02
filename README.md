# Degen Analytics - Privacy-First Betting Analytics

A completely remastered web application for analyzing betting statistics with a focus on **privacy**, **modern design**, and **performance**.

## 🔒 Privacy-First Architecture

- **100% Client-Side Processing** - All data analysis happens in your browser
- **Zero Server Uploads** - Your data never leaves your device
- **Web Workers** - Efficient background processing without blocking the UI
- **No Tracking** - No analytics, no cookies, no data collection

## ✨ Features

- **Modern UI** - Built with TailwindCSS for a sleek, responsive design
- **Fast Processing** - Optimized algorithms with streaming parsers
- **Comprehensive Stats** - Overall metrics, game breakdowns, provider analysis, streaks, and more
- **Real-time Progress** - Visual feedback during data processing
- **Flexible Filtering** - Filter by currency, game, minimum plays, and top N results

## 🚀 Tech Stack

- **Vite** - Lightning-fast build tool and dev server
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first CSS framework
- **Web Workers** - Background processing for performance
- **Vanilla JS** - No heavy framework dependencies
- **Vitest** - Fast unit testing with UI
- **ESLint** - Code linting and quality checks
- **Prettier** - Code formatting

## 📦 Installation

```bash
# Install dependencies
bun install
```

## 🛠️ Development

```bash
# Start dev server (http://localhost:6768)
bun run dev

# Type checking
bun run type-check

# Run tests
bun run test              # Watch mode
bun run test:run          # Run once
bun run test:ui           # Interactive UI
bun run test:coverage     # With coverage

# Linting
bun run lint              # Check for errors
bun run lint:fix          # Auto-fix errors

# Formatting
bun run format            # Format code
bun run format:check      # Check formatting
```

## 🏗️ Build

```bash
# Build for production
bun run build

# Preview production build
bun run preview
```

## 📊 Usage

1. Open the application in your browser
2. Upload your betting data (CSV format)
3. Configure filters (optional):
   - Currency filter
   - Game name filter
   - Top N results
   - Minimum plays threshold
4. Click "Analyze Data"
5. View comprehensive statistics and insights

## 📁 Supported File Format

### CSV Format
```csv
ID,Game,Provider,Amount,Multiplier,Payout,Currency,Status,Created At,Updated At
```

**Required Headers:**
- `ID` - Unique bet identifier
- `Game` - Game name
- `Provider` - Game provider
- `Amount` - Bet amount
- `Multiplier` - Win multiplier
- `Payout` - Payout amount
- `Currency` - Currency code (e.g., USD)
- `Status` - Bet status (complete/rollback)
- `Created At` - Timestamp

## 🎯 Performance

- **Streaming Parser** - Process large files efficiently
- **Web Worker** - Non-blocking computation
- **Optimized Algorithms** - O(n) complexity with Map/Set data structures
- **Minimal Bundle** - No heavy framework overhead

## 🔐 Security

- All processing happens client-side
- No network requests (except loading the app itself)
- No data persistence or storage
- No third-party scripts or tracking

## ✅ Quality Assurance

This project includes comprehensive tooling for code quality:

- **Testing** - Vitest with happy-dom for unit and integration tests
- **Linting** - ESLint with TypeScript support for code quality
- **Formatting** - Prettier for consistent code style
- **Type Safety** - Strict TypeScript configuration

See [TESTING.md](TESTING.md) for detailed documentation.

## 📝 License

Private - For personal use only|
---

Built with ❤️ for privacy-conscious users
