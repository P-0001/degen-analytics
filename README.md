# Degen Analytics - Privacy-First Betting Analytics

A completely remastered web application for analyzing betting statistics with a focus on **privacy**, **modern design**, and **performance**.

🔗 **[View Live Preview](https://degen-analytics.fly.dev/)**

## 🔒 Privacy-First Architecture

- **100% Client-Side Processing** - All data analysis happens in your browser
- **Zero Server Uploads** - Your data never leaves your device
- **Web Workers** - Efficient background processing without blocking the UI
- **No Tracking** - No analytics, no cookies, no data collection

## ✨ Features

- **Modern UI** - Built with TailwindCSS and Handlebars for a sleek, responsive design
- **Fast Processing** - Optimized algorithms with streaming parsers
- **Comprehensive Stats** - Overall metrics, game breakdowns, provider analysis, streaks, and more
- **Transaction Tracking** - Optional deposit and withdrawal file uploads for complete financial overview
- **Visual Analytics** - Interactive equity curve charts powered by Chart.js
- **Real-time Progress** - Visual feedback during data processing
- **Flexible Filtering** - Filter by currency, game, minimum plays, top N results, and top bets
- **Advanced Options** - Collapsible advanced settings for power users

## 🚀 Tech Stack

- **Vite** - Lightning-fast build tool and dev server
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first CSS framework
- **Handlebars** - Templating engine for dynamic UI
- **Chart.js** - Interactive data visualization
- **Web Workers** - Background processing for performance
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

# Deploy to Fly.io (requires Fly.io account)
bun run deploy
```

## 📊 Usage

### Getting Started

1. **Start the application:**
   ```bash
   bun run dev
   ```
   Navigate to `http://localhost:6768` in your browser

2. **Upload your betting data:**
   - Click the "Choose File" button in the main upload section
   - Select your betting history CSV file
   - The file is processed entirely in your browser - no data is uploaded to any server

3. **Upload transaction files (Optional):**
   - Upload deposit CSV file for deposit tracking
   - Upload withdrawal CSV file for withdrawal tracking
   - These files provide a complete financial overview including deposits and withdrawals

4. **Configure analysis filters (Optional):**
   - **Currency Filter**: Enter a currency code (e.g., `USD`, `BTC`) to analyze only bets in that currency
   - **Game Name Filter**: Enter a game name to analyze only that specific game
   - **Top N Results**: Limit the number of games/providers shown (e.g., top 10)
   - **Minimum Plays**: Set a threshold to exclude games with few plays (reduces noise)
   - **Top Bets**: Number of highest/lowest bets to display in the dashboard

5. **Analyze your data:**
   - Click the "Analyze Data" button
   - Watch the real-time progress bar as your data is processed
   - Processing happens in a Web Worker for optimal performance

6. **Explore your statistics:**
   - **Overall Stats**: Total bets, wagered amount, profit/loss, ROI, win rate
   - **Game Breakdown**: Performance by individual games
   - **Provider Analysis**: Performance by game providers
   - **Streaks**: Longest winning/losing streaks
   - **Equity Curve**: Visual chart showing profit/loss over time
   - **Top Bets**: Highest wins and losses
   - **Transaction Summary**: Deposits, withdrawals, and net balance (if transaction files uploaded)

## 📁 Supported File Formats

### Betting Data CSV (Required)

**Example Format:**
```csv
ID,Game,Provider,Amount,Multiplier,Payout,Currency,Status,Created At,Updated At
12345,Sweet Bonanza,Pragmatic Play,1.00,0,0,USD,complete,2024-01-15T10:30:00Z,2024-01-15T10:30:05Z
12346,Gates of Olympus,Pragmatic Play,2.00,5.5,11.00,USD,complete,2024-01-15T10:31:00Z,2024-01-15T10:31:05Z
```

**Required Headers:**
- `ID` - Unique bet identifier (string/number)
- `Game` - Game name (string)
- `Provider` - Game provider name (string)
- `Amount` - Bet amount (number, e.g., 1.00)
- `Multiplier` - Win multiplier (number, 0 for losses)
- `Payout` - Total payout amount (number, 0 for losses)
- `Currency` - Currency code (string, e.g., USD, BTC, EUR)
- `Status` - Bet status (string: "complete" or "rollback")
- `Created At` - Bet timestamp (ISO 8601 format recommended)

**Notes:**
- Header names are case-sensitive
- Rollback bets are excluded from analysis
- Timestamps should be in ISO 8601 format for best results

### Transaction Files (Optional)

**Deposit CSV Example:**
```csv
ID,Status,Type,Method,Amount,Currency,External Amount,External Currency,External Txid,Updated At
D001,complete,deposit,crypto,100.00,USD,0.0025,BTC,tx123abc,2024-01-15T09:00:00Z
```

**Withdrawal CSV Example:**
```csv
ID,Status,Type,Method,Amount,Currency,External Amount,External Currency,External Txid,Updated At
W001,complete,withdrawal,crypto,50.00,USD,0.00125,BTC,tx456def,2024-01-15T15:00:00Z
```

**Transaction Headers:**
- `ID` - Transaction identifier (string/number)
- `Status` - Transaction status (string, e.g., "complete", "pending")
- `Type` - Transaction type (string: "deposit" or "withdrawal")
- `Method` - Payment method (string, e.g., "crypto", "card")
- `Amount` - Transaction amount (number)
- `Currency` - Currency code (string)
- `Updated At` - Transaction timestamp (ISO 8601 format)

**Notes:**
- Only "complete" transactions are included in analysis
- External Amount/Currency/Txid fields are optional
- Transaction files enable full financial tracking including deposits and withdrawals

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
