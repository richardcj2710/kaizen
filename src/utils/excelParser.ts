import * as XLSX from 'xlsx';
import type { RawProductionRow } from '../data/samplePoloLine';
import type { AggregatedFactoryDataset, IngestionProgress } from '../types/kaizen';
import {
  StreamingKaizenAggregator,
  buildColumnIndexMap,
  splitCsvLine,
} from './streamingAggregator';
import type { WorkerResponseMessage } from '../workers/dataAggregator.worker';

export function aggregateFilesInWorker(
  files: File[],
  onProgress: (progress: IngestionProgress) => void
): Promise<AggregatedFactoryDataset> {
  if (typeof Worker !== 'undefined') {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('../workers/dataAggregator.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (event: MessageEvent<WorkerResponseMessage>) => {
        const msg = event.data;
        if (msg.type === 'progress') {
          onProgress(msg.progress);
        } else if (msg.type === 'complete') {
          worker.terminate();
          resolve(msg.dataset);
        } else if (msg.type === 'error') {
          worker.terminate();
          reject(new Error(msg.message));
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        reject(new Error(err.message || 'Lỗi Web Worker khi đọc tệp.'));
      };

      worker.postMessage({ files });
    });
  }

  // Fallback for non-Worker test environments
  return aggregateFilesDirectly(files, onProgress);
}

async function aggregateFilesDirectly(
  files: File[],
  onProgress: (progress: IngestionProgress) => void
): Promise<AggregatedFactoryDataset> {
  const aggregator = new StreamingKaizenAggregator();
  const totalBytes = files.reduce((s, f) => s + f.size, 0);
  let bytesRead = 0;

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.csv')) {
      const text = await file.text();
      bytesRead += file.size;
      const lines = text.split(/\r?\n/);
      let cols = null;
      for (const line of lines) {
        const clean = line.replace(/^\uFEFF/, '').trim();
        if (!clean) continue;
        if (!cols) {
          cols = buildColumnIndexMap(splitCsvLine(clean));
          continue;
        }
        aggregator.ingestRowValues(splitCsvLine(clean), cols);
      }
    } else {
      const buf = await file.arrayBuffer();
      bytesRead += file.size;
      const wb = XLSX.read(buf, { type: 'array' });
      for (const name of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[name], {
          defval: '',
        });
        for (const r of rows) aggregator.ingestObjectRow(r);
      }
    }
    onProgress({
      status: 'processing',
      filesProcessed: i + 1,
      currentFileIndex: i + 1,
      totalFiles: files.length,
      currentFileName: file.name,
      bytesRead,
      totalBytes,
      rowsAggregated: aggregator.rowCount,
      speedMbPerSec: 50,
    });
  }

  return aggregator.finalize(files.map((f) => f.name).join(', '));
}

export function buildSampleWorkbookBytes(rows: RawProductionRow[]): Uint8Array {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DuLieu_SME_7Nam_28Quy');
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

export function downloadSampleExcelFile(
  rows: RawProductionRow[],
  filename = 'mau_chuyen_may_SME_7nam_28quy.xlsx'
): void {
  const bytes = buildSampleWorkbookBytes(rows);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
