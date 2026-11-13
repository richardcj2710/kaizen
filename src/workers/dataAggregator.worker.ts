/// <reference lib="webworker" />
import * as XLSX from 'xlsx';
import type { IngestionProgress } from '../types/kaizen';
import {
  StreamingKaizenAggregator,
  buildColumnIndexMap,
  splitCsvLine,
  type ColumnIndexMap,
} from '../utils/streamingAggregator';

export type WorkerResponseMessage =
  | { type: 'progress'; progress: IngestionProgress }
  | { type: 'complete'; dataset: ReturnType<StreamingKaizenAggregator['finalize']> }
  | { type: 'error'; message: string };

self.onmessage = async (event: MessageEvent<{ files: File[] }>) => {
  const files = event.data?.files ?? [];
  if (files.length === 0) {
    self.postMessage({
      type: 'error',
      message: 'Không có tệp nào được chọn.',
    } satisfies WorkerResponseMessage);
    return;
  }

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const aggregator = new StreamingKaizenAggregator();
  const startTimeMs = performance.now();
  let bytesReadSoFar = 0;
  let lastProgressAt = 0;

  const emitProgress = (
    filesProcessed: number,
    currentFileIndex: number,
    currentFileName: string,
    force = false
  ) => {
    const now = performance.now();
    if (!force && now - lastProgressAt < 80) return;
    lastProgressAt = now;
    const elapsedSec = Math.max(0.05, (now - startTimeMs) / 1000);
    const speedMbPerSec = Number(
      (bytesReadSoFar / (1024 * 1024) / elapsedSec).toFixed(1)
    );

    self.postMessage({
      type: 'progress',
      progress: {
        status: 'processing',
        filesProcessed,
        currentFileIndex,
        totalFiles: files.length,
        currentFileName,
        bytesRead: bytesReadSoFar,
        totalBytes,
        rowsAggregated: aggregator.rowCount,
        speedMbPerSec,
      },
    } satisfies WorkerResponseMessage);
  };

  try {
    // Process uploaded files strictly SEQUENTIALLY one-by-one (<150 MB RAM for 10+ GB)
    for (let fIdx = 0; fIdx < files.length; fIdx += 1) {
      const file = files[fIdx];
      const lower = file.name.toLowerCase();
      emitProgress(fIdx, fIdx + 1, file.name, true);

      if (lower.endsWith('.csv')) {
        const reader = file.stream().getReader();
        const decoder = new TextDecoder('utf-8');
        let leftover = '';
        let cols: ColumnIndexMap | null = null;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          bytesReadSoFar += value.byteLength;
          const decodedChunk = decoder.decode(value, { stream: true });
          const text = leftover ? leftover + decodedChunk : decodedChunk;

          let lineStart = 0;
          const len = text.length;

          while (lineStart < len) {
            const nlIdx = text.indexOf('\n', lineStart);
            if (nlIdx === -1) break;

            if (!cols) {
              const headerLine = text
                .slice(lineStart, nlIdx)
                .replace(/^\uFEFF/, '')
                .trim();
              if (headerLine) {
                cols = buildColumnIndexMap(splitCsvLine(headerLine));
              }
            } else {
              aggregator.ingestCsvLineSlice(text, lineStart, nlIdx, cols);
            }
            lineStart = nlIdx + 1;
          }

          leftover = lineStart < len ? text.slice(lineStart) : '';
          emitProgress(fIdx, fIdx + 1, file.name);
        }

        // Flush any remaining bytes from TextDecoder
        const trailing = decoder.decode();
        const finalText = leftover + trailing;
        if (finalText.length > 0 && cols) {
          aggregator.ingestCsvLineSlice(finalText, 0, finalText.length, cols);
        }

        emitProgress(fIdx + 1, fIdx + 1, file.name, true);
      } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        bytesReadSoFar += file.size;
        const workbook = XLSX.read(buffer, { type: 'array' });

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            defval: '',
          });
          for (const row of rows) {
            aggregator.ingestObjectRow(row);
          }
        }
        emitProgress(fIdx + 1, fIdx + 1, file.name, true);
      } else {
        throw new Error(
          `Định dạng tệp "${file.name}" không được hỗ trợ. Vui lòng dùng .csv hoặc .xlsx.`
        );
      }
    }

    if (aggregator.rowCount === 0) {
      throw new Error(
        'Không tìm thấy dòng dữ liệu hợp lệ nào trong các tệp đã tải lên. Vui lòng kiểm tra tiêu đề cột.'
      );
    }

    bytesReadSoFar = totalBytes;
    emitProgress(
      files.length,
      files.length,
      files[files.length - 1]?.name ?? '',
      true
    );

    const label =
      files.length === 1
        ? `Tệp: ${files[0].name}`
        : `${files.length} tệp (${files.map((f) => f.name).slice(0, 2).join(', ')}${
            files.length > 2 ? '...' : ''
          })`;

    const dataset = aggregator.finalize(label);
    self.postMessage({
      type: 'complete',
      dataset,
    } satisfies WorkerResponseMessage);
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Lỗi xử lý luồng dữ liệu trong Web Worker.';
    self.postMessage({
      type: 'error',
      message,
    } satisfies WorkerResponseMessage);
  }
};
