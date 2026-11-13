/// <reference lib="webworker" />
import * as XLSX from 'xlsx';
import type { IngestionProgress } from '../types/kaizen';
import {
  ByteStringInterner,
  StreamingKaizenAggregator,
  buildColumnIndexMap,
  splitCsvLine,
  type ColumnIndexMap,
} from '../utils/streamingAggregator';

export type WorkerResponseMessage =
  | { type: 'progress'; progress: IngestionProgress }
  | { type: 'complete'; dataset: ReturnType<StreamingKaizenAggregator['finalize']> }
  | { type: 'error'; message: string };

const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB ArrayBuffer slices
const PROGRESS_REPORT_STEP_BYTES = 128 * 1024 * 1024; // Post UI progress every 128 MB

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
  const interner = new ByteStringInterner(50000);
  const headerDecoder = new TextDecoder('utf-8');
  const colStarts = new Int32Array(32);
  const colEnds = new Int32Array(32);

  // Reusable scratch buffer to avoid allocating 8MB+ arrays on every iteration
  let scratchBuf = new Uint8Array(CHUNK_SIZE + 65536);

  const startTimeMs = performance.now();
  let bytesReadSoFar = 0;
  let bytesSinceLastReport = 0;

  const postProgress = (
    filesProcessed: number,
    currentFileIndex: number,
    currentFileName: string
  ) => {
    const elapsedSec = Math.max(0.01, (performance.now() - startTimeMs) / 1000);
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
      postProgress(fIdx, fIdx + 1, file.name);

      if (lower.endsWith('.csv')) {
        let offset = 0;
        let leftoverLen = 0;
        let cols: ColumnIndexMap | null = null;
        let isFirstLine = true;

        while (offset < file.size) {
          const end = Math.min(offset + CHUNK_SIZE, file.size);
          const stepBytes = end - offset;
          const buffer = await file.slice(offset, end).arrayBuffer();
          const chunk = new Uint8Array(buffer);

          const needed = leftoverLen + chunk.length;
          if (needed > scratchBuf.length) {
            const grown = new Uint8Array(needed + 65536);
            if (leftoverLen > 0) grown.set(scratchBuf.subarray(0, leftoverLen), 0);
            scratchBuf = grown;
          }
          scratchBuf.set(chunk, leftoverLen);
          const totalLen = needed;

          let lineStart = 0;
          let colCount = 0;
          let cStart = 0;
          let hasQuotes = false;
          let inQuotes = false;

          for (let i = 0; i < totalLen; i += 1) {
            const b = scratchBuf[i];
            if (b === 34) {
              hasQuotes = true;
              inQuotes = !inQuotes;
            } else if (b === 44 && !inQuotes && cols) {
              if (colCount < 32) {
                colStarts[colCount] = cStart;
                colEnds[colCount] = i;
                colCount += 1;
              }
              cStart = i + 1;
            } else if (b === 10) {
              // Found '\n' (10)
              let lineEnd = i;
              if (lineEnd > lineStart && scratchBuf[lineEnd - 1] === 13) {
                lineEnd -= 1; // Strip '\r' (13)
              }

              if (!cols) {
                if (
                  isFirstLine &&
                  lineEnd - lineStart >= 3 &&
                  scratchBuf[lineStart] === 0xef &&
                  scratchBuf[lineStart + 1] === 0xbb &&
                  scratchBuf[lineStart + 2] === 0xbf
                ) {
                  lineStart += 3;
                }
                if (lineEnd > lineStart) {
                  isFirstLine = false;
                  const headerText = headerDecoder
                    .decode(scratchBuf.subarray(lineStart, lineEnd))
                    .trim();
                  if (headerText) {
                    cols = buildColumnIndexMap(splitCsvLine(headerText));
                  }
                }
              } else if (lineEnd > lineStart) {
                if (colCount < 32) {
                  colStarts[colCount] = cStart;
                  colEnds[colCount] = lineEnd;
                  colCount += 1;
                }
                aggregator.ingestBinaryCsvLine(
                  scratchBuf,
                  colStarts,
                  colEnds,
                  colCount,
                  cols,
                  interner,
                  hasQuotes
                );
              }

              lineStart = i + 1;
              cStart = lineStart;
              colCount = 0;
              hasQuotes = false;
              inQuotes = false;
            }
          }

          // Preserve partial trailing line bytes in-place at index 0
          leftoverLen = totalLen - lineStart;
          if (leftoverLen > 0) {
            scratchBuf.copyWithin(0, lineStart, totalLen);
          }

          offset = end;
          bytesReadSoFar += stepBytes;
          bytesSinceLastReport += stepBytes;

          // Throttle UI progress posts to every 128 MB (avoid main-thread message flooding)
          if (bytesSinceLastReport >= PROGRESS_REPORT_STEP_BYTES) {
            bytesSinceLastReport = 0;
            postProgress(fIdx, fIdx + 1, file.name);
          }
        }

        // Process final line if file did not end with '\n'
        if (leftoverLen > 0) {
          let lineStart = 0;
          let lineEnd = leftoverLen;
          if (lineEnd > 0 && scratchBuf[lineEnd - 1] === 13) lineEnd -= 1;

          if (
            isFirstLine &&
            lineEnd >= 3 &&
            scratchBuf[0] === 0xef &&
            scratchBuf[1] === 0xbb &&
            scratchBuf[2] === 0xbf
          ) {
            lineStart = 3;
          }

          if (lineEnd > lineStart && cols) {
            let colCount = 0;
            let cStart = lineStart;
            let hasQuotes = false;
            let inQuotes = false;

            for (let j = lineStart; j <= lineEnd; j += 1) {
              if (j < lineEnd && scratchBuf[j] === 34) {
                hasQuotes = true;
                inQuotes = !inQuotes;
              } else if (j === lineEnd || (scratchBuf[j] === 44 && !inQuotes)) {
                if (colCount < 32) {
                  colStarts[colCount] = cStart;
                  colEnds[colCount] = j;
                  colCount += 1;
                }
                cStart = j + 1;
              }
            }

            aggregator.ingestBinaryCsvLine(
              scratchBuf,
              colStarts,
              colEnds,
              colCount,
              cols,
              interner,
              hasQuotes
            );
          }
        }

        postProgress(fIdx + 1, fIdx + 1, file.name);
      } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        bytesReadSoFar += file.size;
        bytesSinceLastReport += file.size;
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
        postProgress(fIdx + 1, fIdx + 1, file.name);
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
    postProgress(
      files.length,
      files.length,
      files[files.length - 1]?.name ?? ''
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

