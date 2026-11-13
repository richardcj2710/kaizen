import { useMemo, useState } from 'react';
import { HeaderBar } from './components/HeaderBar';
import { Step1DataInput } from './components/Step1DataInput';
import { Step2LineAnalysis } from './components/Step2LineAnalysis';
import { Step3KaizenPanel } from './components/Step3KaizenPanel';
import { Step4VerificationDashboard } from './components/Step4VerificationDashboard';
import type { KaizenAiRecommendation, StationInput } from './types/kaizen';
import { downloadSampleExcelFile, parseSpreadsheetFile } from './utils/excelParser';
import {
  SAMPLE_POLO_LINE,
  computeVerificationMetrics,
  enforceZeroLayoffInvariant,
  simulateLine,
} from './utils/simulation';

export function App() {
  const [stations, setStations] = useState<StationInput[]>([]);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<KaizenAiRecommendation | null>(null);
  const [optimizedLine, setOptimizedLine] = useState<StationInput[] | null>(null);
  const [showVerification, setShowVerification] = useState(false);

  const currentSimulation = useMemo(() => simulateLine(stations), [stations]);

  const verificationMetrics = useMemo(() => {
    if (!recommendation || !optimizedLine || stations.length === 0) return null;
    return computeVerificationMetrics(
      stations,
      optimizedLine,
      recommendation.estimated_roi_months
    );
  }, [stations, optimizedLine, recommendation]);

  const resetAnalysisState = () => {
    setAiError(null);
    setRecommendation(null);
    setOptimizedLine(null);
    setShowVerification(false);
  };

  const handleLoadSample = () => {
    setInputError(null);
    resetAnalysisState();
    setStations(SAMPLE_POLO_LINE);
    setSourceLabel('Dữ liệu mẫu — Chuyền áo Polo (6 công đoạn)');
  };

  const handleUploadFile = async (file: File) => {
    setInputError(null);
    try {
      const parsed = await parseSpreadsheetFile(file);
      resetAnalysisState();
      setStations(parsed);
      setSourceLabel(`Tệp đã tải: ${file.name} (${parsed.length} công đoạn)`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Không thể đọc tệp dữ liệu. Vui lòng kiểm tra lại.';
      setInputError(msg);
    }
  };

  const handleDownloadTemplate = () => {
    const dataToExport = stations.length > 0 ? stations : SAMPLE_POLO_LINE;
    downloadSampleExcelFile(dataToExport);
  };

  const handleClearData = () => {
    setStations([]);
    setSourceLabel(null);
    setInputError(null);
    resetAnalysisState();
  };

  const handleAnalyzeWithGemini = async () => {
    if (stations.length === 0) return;
    setIsAnalyzing(true);
    setAiError(null);
    setShowVerification(false);

    try {
      const res = await fetch('/api/kaizen/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stations }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        recommendation?: KaizenAiRecommendation;
        optimizedLine?: StationInput[];
      };

      if (!res.ok) {
        throw new Error(payload.error || `Yêu cầu thất bại (Mã lỗi ${res.status}).`);
      }

      if (!payload.recommendation) {
        throw new Error('Phản hồi từ máy chủ không chứa kết quả phân tích hợp lệ.');
      }

      const safeOptimized =
        payload.optimizedLine && payload.optimizedLine.length === stations.length
          ? enforceZeroLayoffInvariant(stations, payload.optimizedLine)
          : enforceZeroLayoffInvariant(stations, payload.recommendation.optimized_stations);

      setRecommendation(payload.recommendation);
      setOptimizedLine(safeOptimized);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Lỗi kết nối đến dịch vụ phân tích Gemini AI.';
      setAiError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <HeaderBar
        stationCount={stations.length}
        totalWorkers={currentSimulation.totalWorkers}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Step1DataInput
          hasData={stations.length > 0}
          sourceLabel={sourceLabel}
          errorMessage={inputError}
          onLoadSample={handleLoadSample}
          onUploadFile={handleUploadFile}
          onDownloadTemplate={handleDownloadTemplate}
          onClearData={handleClearData}
          stations={stations}
        />

        <Step2LineAnalysis simulation={currentSimulation} />

        <Step3KaizenPanel
          hasData={stations.length > 0}
          isAnalyzing={isAnalyzing}
          aiError={aiError}
          recommendation={recommendation}
          optimizedLine={optimizedLine}
          totalBeforeWorkers={currentSimulation.totalWorkers}
          showVerification={showVerification}
          onAnalyzeWithGemini={handleAnalyzeWithGemini}
          onToggleVerification={() => setShowVerification(true)}
        />

        {showVerification && verificationMetrics && (
          <Step4VerificationDashboard metrics={verificationMetrics} />
        )}
      </main>
    </div>
  );
}

export default App;
