import type { StatsResult, FilterOptions } from '../types';

export class DashboardView {
  private stats: StatsResult | null = null;
  private options: FilterOptions = {};
  private onBack: () => void;

  constructor(onBack: () => void) {
    this.onBack = onBack;
  }

  public setStats(stats: StatsResult, options: FilterOptions): void {
    this.stats = stats;
    this.options = options;
  }

  private formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  private formatPercent(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  private formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  public render(): string {
    if (!this.stats) return '<div>No stats available</div>';

    const { overall, games, providers, streaks, invalidRecords, processingTime } = this.stats;
    const currency = overall.currency;

    return `
      <div class="min-h-screen p-6">
        <div class="max-w-7xl mx-auto">
          <div class="flex items-center justify-between mb-8 animate-fade-in">
            <div>
              <h1 class="text-4xl font-bold bg-gradient-to-r from-primary-500 to-secondary-400 bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p class="text-slate-400 mt-2">
                Processed ${this.formatNumber(overall.totalBets)} bets in ${processingTime.toFixed(0)}ms
                ${invalidRecords > 0 ? ` • ${invalidRecords} invalid records excluded` : ''}
              </p>
            </div>
            <button id="back-btn" class="btn-secondary flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              <span>New Analysis</span>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-slide-up">
            <div class="stat-card">
              <div class="flex items-center justify-between mb-2">
                <span class="text-slate-400 text-sm font-medium">Total Wagered</span>
                <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div class="text-3xl font-bold text-slate-100">${this.formatCurrency(overall.totalBet, currency)}</div>
            </div>

            <div class="stat-card">
              <div class="flex items-center justify-between mb-2">
                <span class="text-slate-400 text-sm font-medium">Net Profit/Loss</span>
                <svg class="w-5 h-5 ${overall.net >= 0 ? 'text-accent-200' : 'text-red-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </div>
              <div class="text-3xl font-bold ${overall.net >= 0 ? 'text-accent-200' : 'text-red-400'}">
                ${this.formatCurrency(overall.net, currency)}
              </div>
              <div class="text-sm ${overall.roi >= 0 ? 'text-accent-200' : 'text-red-400'} mt-1">
                ${this.formatPercent(overall.roi)} ROI
              </div>
            </div>

            <div class="stat-card">
              <div class="flex items-center justify-between mb-2">
                <span class="text-slate-400 text-sm font-medium">Win Rate</span>
                <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div class="text-3xl font-bold text-slate-100">${overall.winRate.toFixed(2)}%</div>
              <div class="text-sm text-slate-400 mt-1">
                ${this.formatNumber(overall.wins)}W / ${this.formatNumber(overall.losses)}L / ${this.formatNumber(overall.pushes)}P
              </div>
            </div>

            <div class="stat-card">
              <div class="flex items-center justify-between mb-2">
                <span class="text-slate-400 text-sm font-medium">Max Multiplier</span>
                <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                </svg>
              </div>
              <div class="text-3xl font-bold text-secondary-400">${overall.maxMultiplier.toFixed(2)}x</div>
              ${overall.maxMultiplierBet ? `<div class="text-sm text-slate-400 mt-1">${overall.maxMultiplierBet.gameName}</div>` : ''}
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div class="card p-6">
              <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
                Streaks
              </h3>
              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-slate-400">Current Streak</span>
                  <span class="badge ${
                    streaks.currentStreak.type === 'win' ? 'badge-success' : 
                    streaks.currentStreak.type === 'loss' ? 'badge-danger' : 'badge-neutral'
                  }">
                    ${streaks.currentStreak.count} ${streaks.currentStreak.type}${streaks.currentStreak.count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-slate-400">Longest Win Streak</span>
                  <span class="badge badge-success">${streaks.longestWinStreak}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-slate-400">Longest Loss Streak</span>
                  <span class="badge badge-danger">${streaks.longestLossStreak}</span>
                </div>
              </div>
            </div>

            <div class="card p-6">
              <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Timeline
              </h3>
              <div class="space-y-3">
                <div>
                  <span class="text-slate-400 text-sm">First Bet</span>
                  <div class="text-slate-100 font-medium">${this.formatDate(overall.firstBetTime)}</div>
                </div>
                <div>
                  <span class="text-slate-400 text-sm">Last Bet</span>
                  <div class="text-slate-100 font-medium">${this.formatDate(overall.lastBetTime)}</div>
                </div>
              </div>
            </div>

            <div class="card p-6">
              <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                </svg>
                Notable Bets
              </h3>
              <div class="space-y-3 text-sm">
                ${overall.maxWinBet ? `
                  <div>
                    <span class="text-accent-200 font-medium">Biggest Win</span>
                    <div class="text-slate-300">${this.formatCurrency((overall.maxWinBet.payout - overall.maxWinBet.betAmount), currency)}</div>
                    <div class="text-slate-500 text-xs">${overall.maxWinBet.gameName}</div>
                  </div>
                ` : ''}
                ${overall.maxLossBet ? `
                  <div>
                    <span class="text-red-400 font-medium">Biggest Loss</span>
                    <div class="text-slate-300">${this.formatCurrency((overall.maxLossBet.payout - overall.maxLossBet.betAmount), currency)}</div>
                    <div class="text-slate-500 text-xs">${overall.maxLossBet.gameName}</div>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

          ${games.length > 0 ? `
            <div class="card p-6 mb-8 animate-slide-up">
              <h2 class="text-2xl font-bold mb-6 flex items-center gap-2">
                <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/>
                </svg>
                Top Games
              </h2>
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th class="text-right">Plays</th>
                      <th class="text-right">Wagered</th>
                      <th class="text-right">Net</th>
                      <th class="text-right">ROI</th>
                      <th class="text-right">Win Rate</th>
                      <th class="text-right">Max Multi</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${games.map(game => `
                      <tr>
                        <td class="font-medium text-slate-100">${game.gameName}</td>
                        <td class="text-right text-slate-300">${this.formatNumber(game.count)}</td>
                        <td class="text-right text-slate-300">${this.formatCurrency(game.totalBet, currency)}</td>
                        <td class="text-right font-medium ${game.net >= 0 ? 'text-accent-200' : 'text-red-400'}">
                          ${this.formatCurrency(game.net, currency)}
                        </td>
                        <td class="text-right ${game.roi >= 0 ? 'text-accent-200' : 'text-red-400'}">
                          ${this.formatPercent(game.roi)}
                        </td>
                        <td class="text-right text-slate-300">${game.winRate.toFixed(1)}%</td>
                        <td class="text-right text-secondary-400">${game.maxMultiplier.toFixed(2)}x</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}

          ${providers.length > 0 ? `
            <div class="card p-6 animate-slide-up">
              <h2 class="text-2xl font-bold mb-6 flex items-center gap-2">
                <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
                Top Providers
              </h2>
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th class="text-right">Plays</th>
                      <th class="text-right">Wagered</th>
                      <th class="text-right">Net</th>
                      <th class="text-right">ROI</th>
                      <th class="text-right">Win Rate</th>
                      <th class="text-right">Max Multi</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${providers.map(provider => `
                      <tr>
                        <td class="font-medium text-slate-100">${provider.provider}</td>
                        <td class="text-right text-slate-300">${this.formatNumber(provider.count)}</td>
                        <td class="text-right text-slate-300">${this.formatCurrency(provider.totalBet, currency)}</td>
                        <td class="text-right font-medium ${provider.net >= 0 ? 'text-accent-200' : 'text-red-400'}">
                          ${this.formatCurrency(provider.net, currency)}
                        </td>
                        <td class="text-right ${provider.roi >= 0 ? 'text-accent-200' : 'text-red-400'}">
                          ${this.formatPercent(provider.roi)}
                        </td>
                        <td class="text-right text-slate-300">${provider.winRate.toFixed(1)}%</td>
                        <td class="text-right text-secondary-400">${provider.maxMultiplier.toFixed(2)}x</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}

          <div class="mt-8 text-center">
            <div class="privacy-badge inline-flex">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <span>All data processed locally • No server uploads</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  public attachEventListeners(): void {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.onBack();
      });
    }
  }
}
