# Degen Stats V2 - Privacy-First Betting Analytics

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

## 📦 Installation

```bash
# Install dependencies
bun install
```

## 🛠️ Development

```bash
# Start dev server (http://localhost:6768)
bun run dev
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

## 📝 License

Private - For personal use only

## 🆚 V2 vs V1

| Feature | V1 | V2 |
|---------|----|----|
| **Privacy** | Server-side processing | 100% client-side |
| **UI Framework** | Server-rendered HTML | Modern Vite + TailwindCSS |
| **Performance** | Synchronous processing | Web Workers + streaming |
| **Design** | Basic HTML templates | Modern, animated UI |
| **Build Tool** | Bun serve | Vite with HMR |
| **Bundle Size** | N/A | Minimal, optimized |

---

Built with ❤️ for privacy-conscious users
