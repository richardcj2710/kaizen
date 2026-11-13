import { Factory, Moon, RefreshCw, Sun } from 'lucide-react';
import type { GeminiHealthStatus, ThemeMode } from '../types/kaizen';

interface HeaderProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  stageCount: number;
  totalWorkers: number;
  totalRowsProcessed: number;
  geminiHealth: GeminiHealthStatus;
  onRefreshGeminiHealth: () => void;
}

export function Header({
  theme,
  onToggleTheme,
  stageCount,
  totalWorkers,
  totalRowsProcessed,
  geminiHealth,
  onRefreshGeminiHealth,
}: HeaderProps) {
  const isDark = theme === 'dark';
  const isChecking = geminiHealth.state === 'checking';
  const isConnected = geminiHealth.state === 'connected';

  const statusClasses = isChecking
    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-200'
    : isConnected
      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200'
      : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800/80 text-red-800 dark:text-red-200';

  const dotClasses = isChecking
    ? 'bg-amber-500 animate-pulse'
    : isConnected
      ? 'bg-emerald-500'
      : 'bg-red-500';

  const statusText = isChecking
    ? 'Đang kiểm tra kết nối Gemini...'
    : isConnected
      ? `Gemini AI: Đang hoạt động (${geminiHealth.model})`
      : 'Gemini AI: Mất kết nối';

  const statusTitle = isConnected
    ? `${geminiHealth.message} · Độ trễ ${geminiHealth.latencyMs}ms`
    : geminiHealth.message;

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Factory className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                KAIZEN
              </h1>
              {stageCount > 0 && (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                  {stageCount} khâu · {totalWorkers} công nhân ·{' '}
                  {new Intl.NumberFormat('vi-VN').format(totalRowsProcessed)} dòng dữ liệu
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Hệ thống Quản trị Năng suất, Hàng lỗi &amp; Cân bằng Chuyền May SME (50–100 Công nhân)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 max-w-full">
          <div
            data-testid="gemini-status-badge"
            data-status={geminiHealth.state}
            title={statusTitle}
            role="status"
            aria-live="polite"
            className={`inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors max-w-full ${statusClasses}`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${dotClasses}`}
              aria-hidden="true"
            />
            <span className="break-words">{statusText}</span>

            {geminiHealth.state === 'disconnected' && geminiHealth.message && (
              <span
                data-testid="gemini-status-reason"
                className="text-[11px] font-medium opacity-90 border-l border-red-300 dark:border-red-700 pl-2 break-words"
              >
                {geminiHealth.message}
              </span>
            )}

            {isConnected && geminiHealth.latencyMs > 0 && (
              <span className="text-[11px] font-mono opacity-80 hidden sm:inline tabular-nums">
                {geminiHealth.latencyMs}ms
              </span>
            )}

            <button
              type="button"
              onClick={onRefreshGeminiHealth}
              disabled={isChecking}
              data-testid="gemini-recheck-btn"
              title="Kiểm tra lại kết nối Gemini AI"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-current/25 bg-white/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/70 text-[11px] font-semibold transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw
                className={`w-3 h-3 shrink-0 ${isChecking ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>Kiểm tra lại</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap shrink-0"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                <span>Chế độ Sáng</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600 shrink-0" aria-hidden="true" />
                <span>Chế độ Tối</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
