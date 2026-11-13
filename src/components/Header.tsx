import { Cpu, Factory, Moon, Sun } from 'lucide-react';
import type { ThemeMode } from '../types/kaizen';

interface HeaderProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  stageCount: number;
  totalWorkers: number;
  totalRowsProcessed: number;
}

export function Header({
  theme,
  onToggleTheme,
  stageCount,
  totalWorkers,
  totalRowsProcessed,
}: HeaderProps) {
  const isDark = theme === 'dark';

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

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs font-semibold whitespace-nowrap">
            <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
            <span>Sẵn sàng kết nối Gemini AI</span>
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
