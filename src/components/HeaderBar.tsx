import { Cpu, Factory } from 'lucide-react';

interface HeaderBarProps {
  stationCount: number;
  totalWorkers: number;
}

export function HeaderBar({ stationCount, totalWorkers }: HeaderBarProps) {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Factory className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
                KAIZEN
              </h1>
              {stationCount > 0 && (
                <span className="hidden sm:inline text-xs font-medium text-slate-500 tabular-nums whitespace-nowrap">
                  {stationCount} công đoạn · {totalWorkers} lao động · Giai đoạn B10–B12
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 mt-0.5">
              Hệ thống Mô phỏng &amp; Cân bằng Chuyền May Nhân văn (0% Sa thải)
            </p>
          </div>
        </div>

        <div className="flex items-center shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold whitespace-nowrap">
            <Cpu className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
            <span>Sẵn sàng kết nối Gemini AI</span>
          </div>
        </div>
      </div>
    </header>
  );
}
