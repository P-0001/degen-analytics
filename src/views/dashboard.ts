import type { StatsResult } from '../types';
import Handlebars from 'handlebars';
import dashboardTemplate from '../templates/dashboard.hbs?raw';
import statCardPartial from '../templates/partials/statCard.hbs?raw';
import streaksCardPartial from '../templates/partials/streaksCard.hbs?raw';
import timelineCardPartial from '../templates/partials/timelineCard.hbs?raw';
import notableBetsCardPartial from '../templates/partials/notableBetsCard.hbs?raw';
import transactionsCardPartial from '../templates/partials/transactionsCard.hbs?raw';

export class DashboardView {
  private stats: StatsResult | null = null;
  private onBack: () => void;
  private static helpersRegistered = false;
  private backButtonHandler: (() => void) | null = null;

  constructor(onBack: () => void) {
    this.onBack = onBack;
    DashboardView.registerHandlebarsHelpers();
  }

  private static registerHandlebarsHelpers(): void {
    if (this.helpersRegistered) return;
    this.helpersRegistered = true;

    Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);

    Handlebars.registerPartial('statCard', statCardPartial);
    Handlebars.registerPartial('streaksCard', streaksCardPartial);
    Handlebars.registerPartial('timelineCard', timelineCardPartial);
    Handlebars.registerPartial('notableBetsCard', notableBetsCardPartial);
    Handlebars.registerPartial('transactionsCard', transactionsCardPartial);
  }

  public setStats(stats: StatsResult): void {
    this.stats = stats;
  }

  private formatCurrency(value: number, currency: string = 'USD'): string {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    }
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat(undefined).format(value);
  }

  private formatPercent(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  private formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat(undefined, {
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

    const template = Handlebars.compile(dashboardTemplate);

    const data = {
      totalBets: this.formatNumber(overall.totalBets),
      processingTime: processingTime.toFixed(0),
      invalidRecords: invalidRecords > 0 ? invalidRecords : null,
      totalWagered: this.formatCurrency(overall.totalBet, currency),
      netProfit: this.formatCurrency(overall.net, currency),
      netClass: overall.net >= 0 ? 'text-accent-200' : 'text-red-400',
      roiText: `${this.formatPercent(overall.roi)} ROI`,
      winRateText: `${overall.winRate.toFixed(2)}%`,
      winLossText: `${this.formatNumber(overall.wins)}W / ${this.formatNumber(overall.losses)}L / ${this.formatNumber(overall.pushes)}P`,
      maxMultiplierText: `${overall.maxMultiplier.toFixed(2)}x`,
      maxMultiplierGame: overall.maxMultiplierBet?.gameName || 'N/A',
      streaks: {
        current: `${streaks.currentStreak.count} ${streaks.currentStreak.type}${streaks.currentStreak.count !== 1 ? 's' : ''}`,
        currentClass:
          streaks.currentStreak.type === 'win'
            ? 'badge-success'
            : streaks.currentStreak.type === 'loss'
              ? 'badge-danger'
              : 'badge-neutral',
        longestWin: streaks.longestWinStreak,
        longestLoss: streaks.longestLossStreak,
      },
      firstBet: this.formatDate(overall.firstBetTime),
      lastBet: this.formatDate(overall.lastBetTime),
      maxWin: overall.maxWinBet
        ? {
            amount: this.formatCurrency(
              overall.maxWinBet.payout - overall.maxWinBet.betAmount,
              currency
            ),
            game: overall.maxWinBet.gameName,
          }
        : null,
      maxLoss: overall.maxLossBet
        ? {
            amount: this.formatCurrency(
              overall.maxLossBet.payout - overall.maxLossBet.betAmount,
              currency
            ),
            game: overall.maxLossBet.gameName,
          }
        : null,
      hasGames: games.length > 0,
      games: games.map(g => ({
        gameName: g.gameName,
        count: this.formatNumber(g.count),
        wagered: this.formatCurrency(g.totalBet, currency),
        net: this.formatCurrency(g.net, currency),
        netClass: g.net >= 0 ? 'text-accent-200' : 'text-red-400',
        roi: this.formatPercent(g.roi),
        roiClass: g.roi >= 0 ? 'text-accent-200' : 'text-red-400',
        winRate: `${g.winRate.toFixed(1)}%`,
        maxMultiplier: `${g.maxMultiplier.toFixed(2)}x`,
      })),
      hasProviders: providers.length > 0,
      providers: providers.map(p => ({
        provider: p.provider,
        count: this.formatNumber(p.count),
        wagered: this.formatCurrency(p.totalBet, currency),
        net: this.formatCurrency(p.net, currency),
        netClass: p.net >= 0 ? 'text-accent-200' : 'text-red-400',
        roi: this.formatPercent(p.roi),
        roiClass: p.roi >= 0 ? 'text-accent-200' : 'text-red-400',
        winRate: `${p.winRate.toFixed(1)}%`,
        maxMultiplier: `${p.maxMultiplier.toFixed(2)}x`,
      })),
      hasTransactions: overall.transactions !== undefined,
      transactions: overall.transactions
        ? {
            totalDeposits: this.formatCurrency(overall.transactions.totalDeposits, currency),
            totalWithdrawals: this.formatCurrency(overall.transactions.totalWithdrawals, currency),
            depositCount: this.formatNumber(overall.transactions.depositCount),
            withdrawalCount: this.formatNumber(overall.transactions.withdrawalCount),
            netTransactions: this.formatCurrency(overall.transactions.netTransactions, currency),
            netClass:
              overall.transactions.netTransactions >= 0 ? 'text-accent-200' : 'text-red-400',
          }
        : null,
    };

    return template(data);
  }

  public attachEventListeners(): void {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      // Remove old listener if exists
      if (this.backButtonHandler) {
        backBtn.removeEventListener('click', this.backButtonHandler);
      }

      // Create and store new handler
      this.backButtonHandler = () => {
        this.onBack();
      };

      backBtn.addEventListener('click', this.backButtonHandler);
    }
  }
}
