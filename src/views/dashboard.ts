import type { StatsResult } from '../types';
import Handlebars from 'handlebars';
import dashboardTemplate from '../templates/dashboard.hbs?raw';
import statCardPartial from '../templates/partials/statCard.hbs?raw';
import streaksCardPartial from '../templates/partials/streaksCard.hbs?raw';
import timelineCardPartial from '../templates/partials/timelineCard.hbs?raw';
import notableBetsCardPartial from '../templates/partials/notableBetsCard.hbs?raw';
import transactionsCardPartial from '../templates/partials/transactionsCard.hbs?raw';
import betsStatsCardPartial from '../templates/partials/betsStatsCard.hbs?raw';
import {
  Chart,
  type ChartOptions,
  type TooltipItem,
  type Plugin,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
  DoughnutController,
  ArcElement,
} from 'chart.js';

export class DashboardView {
  private stats: StatsResult | null = null;
  private onBack: () => void;
  private static helpersRegistered = false;
  private static chartComponentsRegistered = false;
  private backButtonHandler: (() => void) | null = null;
  private equityChart: Chart | null = null;
  private outcomesChart: Chart | null = null;

  constructor(onBack: () => void) {
    this.onBack = onBack;
    DashboardView.registerHandlebarsHelpers();
    DashboardView.registerChartComponents();
  }

  private static registerChartComponents(): void {
    if (this.chartComponentsRegistered) return;
    this.chartComponentsRegistered = true;

    Chart.register(
      LineController,
      LineElement,
      PointElement,
      LinearScale,
      CategoryScale,
      Filler,
      Tooltip,
      Legend,
      DoughnutController,
      ArcElement
    );
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
    Handlebars.registerPartial('betsStatsCard', betsStatsCardPartial);
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
      timeZoneName: 'short',
    }).format(date);
  }

  public render(): string {
    if (!this.stats) return '<div>No stats available</div>';

    const {
      overall,
      games,
      providers,
      streaks,
      betStats,
      invalidRecords,
      processingTime,
      equityCurve,
    } = this.stats;
    const currency = overall.currency;

    const avgBetValue = overall.totalBets > 0 ? overall.totalBet / overall.totalBets : 0;

    let maxDrawdownValue = 0;

    if (equityCurve.length > 0) {
      let peak = equityCurve[0]?.value ?? 0;
      for (const p of equityCurve) {
        if (p.value > peak) peak = p.value;
        const dd = peak - p.value;
        if (dd > maxDrawdownValue) maxDrawdownValue = dd;
      }
    }

    const dailyEquityMap = this.buildDailyEquityMap(equityCurve);
    const sortedDayKeys = Array.from(dailyEquityMap.keys()).sort();
    const dayNet = new Map<string, number>();
    for (let i = 0; i < sortedDayKeys.length; i++) {
      const key = sortedDayKeys[i]!;
      const dayEnd = dailyEquityMap.get(key)!;
      // Baseline: previous day's end-of-day cumulative equity, or 0 for the first day
      const prevDayKey = i > 0 ? sortedDayKeys[i - 1] : undefined;
      const prevEnd = prevDayKey !== undefined ? (dailyEquityMap.get(prevDayKey) ?? 0) : 0;
      dayNet.set(key, dayEnd - prevEnd);
    }

    let bestDayKey: string | null = null;
    let bestDayValue = Number.NEGATIVE_INFINITY;
    for (const [k, v] of dayNet.entries()) {
      if (v > bestDayValue) {
        bestDayValue = v;
        bestDayKey = k;
      }
    }

    let worstDayKey: string | null = null;
    let worstDayValue = Number.POSITIVE_INFINITY;
    for (const [k, v] of dayNet.entries()) {
      if (v < worstDayValue) {
        worstDayValue = v;
        worstDayKey = k;
      }
    }

    const bestDayText =
      bestDayKey && Number.isFinite(bestDayValue) && dayNet.size > 0
        ? (() => {
            const parts = bestDayKey.split('-');
            if (parts.length !== 3) return 'N/A';
            const [year, month, day] = parts.map(Number);
            if (
              !Number.isFinite(year) ||
              !Number.isFinite(month) ||
              !Number.isFinite(day) ||
              year < 1970 ||
              month < 1 ||
              month > 12 ||
              day < 1 ||
              day > 31
            )
              return 'N/A';
            const d = new Date(Date.UTC(year, month - 1, day));
            const dateText = new Intl.DateTimeFormat(undefined, {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
            }).format(d);
            const sign = bestDayValue >= 0 ? '+' : '-';
            const amount = this.formatCurrency(Math.abs(bestDayValue), currency);
            return `${dateText} (${sign}${amount.replace(/^-/, '')})`;
          })()
        : 'N/A';

    const worstDayText =
      worstDayKey && Number.isFinite(worstDayValue) && dayNet.size > 0
        ? (() => {
            const parts = worstDayKey.split('-');
            if (parts.length !== 3) return 'N/A';
            const [year, month, day] = parts.map(Number);
            if (
              !Number.isFinite(year) ||
              !Number.isFinite(month) ||
              !Number.isFinite(day) ||
              year < 1970 ||
              month < 1 ||
              month > 12 ||
              day < 1 ||
              day > 31
            )
              return 'N/A';
            const d = new Date(Date.UTC(year, month - 1, day));
            const dateText = new Intl.DateTimeFormat(undefined, {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
            }).format(d);
            const sign = worstDayValue >= 0 ? '+' : '-';
            const amount = this.formatCurrency(Math.abs(worstDayValue), currency);
            return `${dateText} (${sign}${amount.replace(/^-/, '')})`;
          })()
        : 'N/A';

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
      avgBet: this.formatCurrency(avgBetValue, currency),
      bestDay: bestDayText,
      worstDay: worstDayText,
      maxDrawdown: this.formatCurrency(maxDrawdownValue, currency),
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
      topBets:
        betStats?.topBets?.map(bet => ({
          betAmount: this.formatCurrency(bet.betAmount, currency),
          payout: this.formatCurrency(bet.payout, currency),
          multiplier: bet.multiplier.toFixed(2) + 'x',
          time: this.formatDate(bet.time),
          game: bet.gameName,
        })) || [],
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

    this.renderCharts();
  }

  public destroy(): void {
    this.destroyCharts();
    this.stats = null;

    const backBtn = document.getElementById('back-btn');
    if (backBtn && this.backButtonHandler) {
      backBtn.removeEventListener('click', this.backButtonHandler);
      this.backButtonHandler = null;
    }
  }

  private buildDailyEquityMap(equityCurve: { time: number; value: number }[]): Map<string, number> {
    const dailyEquity = new Map<string, number>();
    const sorted = [...equityCurve].sort((a, b) => a.time - b.time);
    for (const p of sorted) {
      const d = new Date(p.time);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      dailyEquity.set(key, p.value);
    }
    return dailyEquity;
  }

  private destroyCharts(): void {
    if (this.equityChart) {
      this.equityChart.destroy();
      this.equityChart = null;
    }
    if (this.outcomesChart) {
      this.outcomesChart.destroy();
      this.outcomesChart = null;
    }
  }

  private renderCharts(): void {
    if (!this.stats) return;

    const equityCanvas = document.getElementById('equity-chart') as HTMLCanvasElement | null;
    const outcomesCanvas = document.getElementById('outcomes-chart') as HTMLCanvasElement | null;
    if (!equityCanvas || !outcomesCanvas) return;

    this.destroyCharts();

    try {
      const currency = this.stats.overall.currency;

      const equityCtx = equityCanvas.getContext('2d');
      const outcomesCtx = outcomesCanvas.getContext('2d');
      if (!equityCtx || !outcomesCtx) return;

      if (this.stats.equityCurve.length === 0) {
        const emptyMsg = 'No bet data available for chart';
        for (const canvas of [equityCanvas, outcomesCanvas]) {
          const ctx2d = canvas.getContext('2d');
          if (ctx2d) {
            ctx2d.fillStyle = 'rgba(148, 163, 184, 0.6)';
            ctx2d.font = '14px system-ui, -apple-system, sans-serif';
            ctx2d.textAlign = 'center';
            ctx2d.textBaseline = 'middle';
            ctx2d.fillText(emptyMsg, canvas.width / 2, canvas.height / 2);
          }
        }
        return;
      }

      const dailyEquity = this.buildDailyEquityMap(this.stats.equityCurve);

      const sortedDays = Array.from(dailyEquity.keys()).sort();
      const equityLabels = sortedDays.map(key => {
        const parts = key.split('-');
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);
        if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
          return 'Invalid';
        }
        const date = new Date(Date.UTC(year, month - 1, day));
        return new Intl.DateTimeFormat(undefined, {
          month: 'short',
          day: '2-digit',
          year: '2-digit',
        }).format(date);
      });
      const equityValues = sortedDays.map(key => dailyEquity.get(key) ?? 0);

      const positiveValues = equityValues.map((v, i) => {
        if (v >= 0) return v;
        const prev = i > 0 ? equityValues[i - 1] : null;
        if (prev !== null && prev !== undefined && prev >= 0) return 0;
        return null;
      });
      const negativeValues = equityValues.map((v, i) => {
        if (v < 0) return v;
        const prev = i > 0 ? equityValues[i - 1] : null;
        if (prev !== null && prev !== undefined && prev < 0) return 0;
        return null;
      });

      const commonGridColor = 'rgba(148, 163, 184, 0.10)';
      const commonTickColor = 'rgba(148, 163, 184, 0.78)';

      const canvasHeight =
        equityCanvas.getBoundingClientRect().height ||
        equityCanvas.clientHeight ||
        equityCanvas.height ||
        260;
      const equityGradient = equityCtx.createLinearGradient(0, 0, 0, canvasHeight);
      equityGradient.addColorStop(0, 'rgba(52, 211, 153, 0.28)');
      equityGradient.addColorStop(1, 'rgba(52, 211, 153, 0.00)');

      const equityGradientRed = equityCtx.createLinearGradient(0, 0, 0, canvasHeight);
      equityGradientRed.addColorStop(0, 'rgba(248, 113, 113, 0.22)');
      equityGradientRed.addColorStop(1, 'rgba(248, 113, 113, 0.00)');

      const lineGlowPlugin: Plugin<'line'> = {
        id: 'lineGlow',
        beforeDatasetsDraw: chart => {
          const ctx = chart.ctx;
          if (!ctx) return;
          ctx.save();
          ctx.shadowColor = 'rgba(52, 211, 153, 0.35)';
          ctx.shadowBlur = 10;
        },
        afterDatasetsDraw: chart => {
          chart?.ctx?.restore();
        },
        afterDestroy: chart => {
          chart?.ctx?.restore();
        },
      };

      const crosshairPlugin: Plugin<'line'> = {
        id: 'crosshair',
        afterDraw: chart => {
          const active = chart.getActiveElements();
          if (!active || active.length === 0) return;

          const activeElement = active[0];
          if (!activeElement || !activeElement.element) return;

          const { ctx, chartArea } = chart;
          const x = activeElement.element.x;

          ctx.save();
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(x, chartArea.top);
          ctx.lineTo(x, chartArea.bottom);
          ctx.stroke();
          ctx.restore();
        },
      };

      const lineOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 750,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            borderColor: 'rgba(148, 163, 184, 0.18)',
            borderWidth: 1,
            titleColor: 'rgba(226, 232, 240, 0.95)',
            bodyColor: 'rgba(226, 232, 240, 0.95)',
            padding: 10,
            displayColors: false,
            callbacks: {
              label: (ctx: TooltipItem<'line'>) => {
                const value = typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0;
                try {
                  return new Intl.NumberFormat(undefined, {
                    style: 'currency',
                    currency,
                    maximumFractionDigits: 2,
                  }).format(value);
                } catch {
                  return value.toFixed(2);
                }
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: commonGridColor },
            ticks: {
              color: commonTickColor,
              maxTicksLimit: 12,
              autoSkip: true,
              maxRotation: 0,
            },
            border: { display: false },
          },
          y: {
            grid: { color: commonGridColor },
            ticks: {
              color: commonTickColor,
              maxTicksLimit: 8,
            },
            border: { display: false },
          },
        },
      };

      this.equityChart = new Chart(equityCanvas, {
        type: 'line',
        data: {
          labels: equityLabels,
          datasets: [
            {
              data: positiveValues,
              borderColor: '#34d399',
              backgroundColor: equityGradient,
              fill: true,
              tension: 0.25,
              pointRadius: 0,
              borderWidth: 2,
            },
            {
              data: negativeValues,
              borderColor: '#f87171',
              backgroundColor: equityGradientRed,
              fill: true,
              tension: 0.25,
              pointRadius: 0,
              borderWidth: 2,
            },
          ],
        },
        options: lineOptions,
        plugins: [lineGlowPlugin, crosshairPlugin],
      });

      const { wins, losses, pushes } = this.stats.overall;

      const winRate = wins + losses + pushes > 0 ? (wins / (wins + losses + pushes)) * 100 : 0;
      const centerLabelPlugin: Plugin<'doughnut'> = {
        id: 'centerLabel',
        beforeDraw: chart => {
          const { ctx, chartArea } = chart;
          const centerX = (chartArea.left + chartArea.right) / 2;
          const centerY = (chartArea.top + chartArea.bottom) / 2;

          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          ctx.fillStyle = 'rgba(226, 232, 240, 0.96)';
          ctx.font = '600 20px system-ui, -apple-system, Segoe UI, Roboto, Arial';
          ctx.fillText(`${winRate.toFixed(1)}%`, centerX, centerY - 8);

          ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
          ctx.font = '500 12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
          ctx.fillText('Win Rate', centerX, centerY + 14);

          ctx.restore();
        },
      };

      const doughnutOptions: ChartOptions<'doughnut'> = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 750,
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: commonTickColor,
              boxWidth: 20,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            borderColor: 'rgba(148, 163, 184, 0.18)',
            borderWidth: 1,
            titleColor: 'rgba(226, 232, 240, 0.95)',
            bodyColor: 'rgba(226, 232, 240, 0.95)',
            padding: 10,
          },
        },
        cutout: '65%',
      };

      this.outcomesChart = new Chart(outcomesCanvas, {
        type: 'doughnut',
        data: {
          labels: ['Win', 'Loss', 'Push'],
          datasets: [
            {
              data: [wins, losses, pushes],
              backgroundColor: ['#34d399', '#f87171', '#94a3b8'],
              borderColor: 'rgba(15, 23, 42, 0.9)',
              borderWidth: 2,
            },
          ],
        },
        options: doughnutOptions,
        plugins: [centerLabelPlugin],
      });
    } catch (error) {
      console.error('Chart rendering error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown chart error';
      throw new Error(`Failed to render charts: ${errorMsg}`, { cause: error });
    }
  }
}
