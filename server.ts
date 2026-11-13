import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { normalizeOptimizedStages } from './src/utils/simulationEngine.ts';
import type { KaizenAiRecommendation, QuarterSummary } from './src/types/kaizen.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-4-hydrogen';

function mapGeminiError(
  err: unknown,
  model: string
): { httpStatus: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const upper = raw.toUpperCase();

  if (upper.includes('MISSING_KEY')) {
    return {
      httpStatus: 503,
      message: 'Thiếu GEMINI_API_KEY trong .env',
    };
  }
  if (upper.includes('400') || upper.includes('API_KEY_INVALID') || upper.includes('INVALID ARGUMENT')) {
    return {
      httpStatus: 400,
      message: 'API Key không hợp lệ (400)',
    };
  }
  if (upper.includes('403') || upper.includes('PERMISSION_DENIED')) {
    return {
      httpStatus: 403,
      message: 'API Key không hợp lệ (403)',
    };
  }
  if (upper.includes('429') || upper.includes('RESOURCE_EXHAUSTED') || upper.includes('QUOTA')) {
    return {
      httpStatus: 429,
      message: 'Vượt giới hạn lượt gọi (429)',
    };
  }
  if (upper.includes('404') || upper.includes('NOT_FOUND')) {
    return {
      httpStatus: 404,
      message: `Model ${model} không khả dụng (404)`,
    };
  }
  if (upper.includes('503') || upper.includes('UNAVAILABLE') || upper.includes('OVERLOADED')) {
    return {
      httpStatus: 503,
      message: 'Dịch vụ Gemini tạm thời quá tải (503)',
    };
  }
  if (upper.includes('FETCH') || upper.includes('ENOTFOUND') || upper.includes('ETIMEDOUT') || upper.includes('ABORT')) {
    return {
      httpStatus: 504,
      message: 'Lỗi kết nối mạng',
    };
  }

  return {
    httpStatus: 500,
    message: raw ? `Lỗi kết nối Gemini API: ${raw.slice(0, 140)}` : 'Lỗi kết nối mạng',
  };
}

const SYSTEM_INSTRUCTION_VI = `Bạn là Chuyên gia Kỹ thuật Công nghiệp (IE - Industrial Engineering), Giám đốc Tài chính Xưởng May (CFO) và Chuyên gia Lean nhân văn cố vấn cho xưởng may gia công SME (50–100 công nhân).

Khi phân tích JSON tổng hợp 3 tầng (Quý -> Khâu -> Tổ) kèm dữ liệu Tài chính & Nhu cầu thị trường, bạn PHẢI đưa ra đánh giá thực tế theo đúng 6 trụ cột sau:
1. CHẨN ĐOÁN TỔ NGHẼN & TỶ LỆ HÀNG LỖI ĐA NĂM / THEO QUÝ:
   - Chỉ rõ TỔ nào trong KHÂU nào có năng suất thấp hoặc tỷ lệ lỗi vượt ngưỡng (> 3.5% / > 4.5%) và diễn biến từ kỳ đầu đến kỳ cuối.
   - Bám chuẩn năng suất thực tế 50%–65% (trong optimized_stages chỉ đặt HieuSuat_TB từ 54%–66%).
2. ĐIỀU CHUYỂN NHÂN SỰ LIÊN TỔ (TRONG KHUNG 50–100 LAO ĐỘNG):
   - Điều chuyển công nhân lành nghề (55%–65%) từ tổ dư công suất sang hỗ trợ khâu/tổ nút thắt.
3. ĐÁNH GIÁ SA THẢI / THAY THẾ CÓ MỤC TIÊU VỊ TRÍ CÁ BIỆT (<35% NS / >4.5% LỖI):
   - Chỉ rõ mã công nhân cá biệt; tuyệt đối không sa thải hàng loạt khi thị trường suy giảm mà bảo vệ đội ngũ cốt lõi.
4. GIẢI PHÁP KỸ THUẬT & CHẤT LƯỢNG:
   - Đề xuất Gá cữ may chống lệch, Inline QC tại bàn hoặc Máy chuyên dùng lập trình phù hợp ngân sách.
5. CHIẾN LƯỢC TỐI ĐA HÓA LỢI NHUẬN THEO BỐI CẢNH THỊ TRƯỜNG:
   - Giải thích rõ lợi nhuận ròng được tối đa hóa ra sao dưới chế độ đơn hàng & giá bán hiện tại (nếu cầu vượt công suất: mở nút thắt thu hồi doanh thu; nếu suy giảm: tránh sản xuất dư thừa tồn kho và tập trung cắt giảm thiệt hại hàng lỗi).
6. PHÂN TÁCH NGUỒN LỢI NHUẬN & BẢO TOÀN SINH KẾ CÔNG NHÂN:
   - Tách bạch phần lợi nhuận đến từ "Mở khóa doanh thu mới" vs. "Cắt giảm lãng phí hàng lỗi/nhân công", đồng thời chứng minh sinh kế và thu nhập công nhân được bảo vệ ra sao.

Tất cả bằng tiếng Việt chuyên ngành may mặc & tài chính rõ ràng, giữ nguyên mã id các Khâu trong optimized_stages.`;

const KAIZEN_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    bottleneck_stage_id: {
      type: Type.STRING,
      description: 'Mã id của Khâu đang nghẽn cổ chai hoặc có tỷ lệ lỗi cao nhất.',
    },
    weakest_team_name: {
      type: Type.STRING,
      description: 'Tên Tổ sản xuất yếu nhất (năng suất thấp hoặc hàng lỗi cao nhất).',
    },
    flagged_worker_ids: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Danh sách mã công nhân cá biệt (<35% hiệu suất hoặc >4.5% lỗi).',
    },
    bottleneck_and_defect_diagnosis_vi: {
      type: Type.STRING,
      description:
        'Chẩn đoán cụ thể Tổ/Khâu nghẽn, tỷ lệ hàng lỗi và diễn biến suy giảm qua các quý.',
    },
    cross_team_reallocation_vi: {
      type: Type.STRING,
      description:
        'Phương án điều chuyển thợ giỏi (55%-65%) từ tổ dư năng suất sang tổ nút thắt.',
    },
    outlier_layoff_evaluation_vi: {
      type: Type.STRING,
      description:
        'Đánh giá xử lý có chọn lọc mã công nhân cá biệt (<35% NS / >4.5% lỗi) gắn với nguyên tắc nhân văn.',
    },
    technical_and_quality_kaizen_vi: {
      type: Type.STRING,
      description:
        'Đề xuất Gá cữ may chống lệch, Inline QC tại bàn hoặc Máy chuyên dùng lập trình cho tổ yếu nhất.',
    },
    profit_maximization_strategy_vi: {
      type: Type.STRING,
      description:
        'Giải thích cách phương án tối đa hóa lợi nhuận ròng theo bối cảnh nhu cầu & đơn giá bán hiện tại.',
    },
    revenue_vs_waste_split_vi: {
      type: Type.STRING,
      description:
        'Phân tách tỷ trọng lợi nhuận tăng thêm đến từ mở khóa doanh thu đơn hàng mới so với giảm thiệt hại hàng lỗi & nhân công.',
    },
    human_livelihood_protection_vi: {
      type: Type.STRING,
      description:
        'Giải thích cách bảo toàn việc làm, nâng tay nghề tại bàn và ổn định thu nhập cho 95%-100% công nhân.',
    },
    recommended_layoff_count: {
      type: Type.INTEGER,
      description: 'Số vị trí cá biệt đề xuất cắt giảm/thay thế.',
    },
    projected_defect_reduction_pct: {
      type: Type.NUMBER,
      description: 'Phần trăm giảm tỷ lệ hàng lỗi toàn xưởng dự kiến (ví dụ 45).',
    },
    estimated_roi_months: {
      type: Type.NUMBER,
      description: 'Số tháng hoàn vốn đầu tư gá cữ/máy (ví dụ 3.5).',
    },
    optimized_stages: {
      type: Type.ARRAY,
      description: 'Danh sách toàn bộ các Khâu sau tái phân bổ tổ và cải tiến chất lượng.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          SoLaoDong: { type: Type.INTEGER },
          TG_SMV: { type: Type.NUMBER },
          HieuSuat_TB: { type: Type.INTEGER },
          TyLeLoi: { type: Type.NUMBER },
          WIP: { type: Type.INTEGER },
        },
        required: ['id', 'SoLaoDong', 'TG_SMV', 'HieuSuat_TB', 'TyLeLoi', 'WIP'],
      },
    },
  },
  required: [
    'bottleneck_stage_id',
    'weakest_team_name',
    'flagged_worker_ids',
    'bottleneck_and_defect_diagnosis_vi',
    'cross_team_reallocation_vi',
    'outlier_layoff_evaluation_vi',
    'technical_and_quality_kaizen_vi',
    'profit_maximization_strategy_vi',
    'revenue_vs_waste_split_vi',
    'human_livelihood_protection_vi',
    'recommended_layoff_count',
    'projected_defect_reduction_pct',
    'estimated_roi_months',
    'optimized_stages',
  ],
};

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.length < 20) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      model: GEMINI_MODEL,
    });
  });

  app.get('/api/gemini/health', async (_req, res) => {
    const startMs = Date.now();
    const ai = createGeminiClient();
    if (!ai) {
      res.json({
        ok: false,
        model: GEMINI_MODEL,
        latencyMs: Date.now() - startMs,
        message: 'Thiếu GEMINI_API_KEY trong .env',
      });
      return;
    }

    try {
      let lastHealthError: unknown = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: 'ping',
            config: {
              maxOutputTokens: 5,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          });
          lastHealthError = null;
          break;
        } catch (err: unknown) {
          lastHealthError = err;
          const mappedErr = mapGeminiError(err, GEMINI_MODEL);
          if (mappedErr.httpStatus !== 503 || attempt === 1) {
            throw err;
          }
          await new Promise((r) => setTimeout(r, 400));
        }
      }
      if (lastHealthError) throw lastHealthError;
      res.json({
        ok: true,
        model: GEMINI_MODEL,
        latencyMs: Date.now() - startMs,
        message: `Đang hoạt động (${GEMINI_MODEL})`,
      });
    } catch (error: unknown) {
      const mapped = mapGeminiError(error, GEMINI_MODEL);
      res.json({
        ok: false,
        model: GEMINI_MODEL,
        latencyMs: Date.now() - startMs,
        message: mapped.message,
      });
    }
  });

  app.post('/api/kaizen/analyze', async (req, res) => {
    try {
      const compactSummary = req.body?.summary;
      const activeSummary = req.body?.activeSummary as QuarterSummary | undefined;

      if (!compactSummary || !activeSummary || !Array.isArray(activeSummary.stages)) {
        res.status(400).json({
          error: 'Dữ liệu tổng hợp 3 tầng không hợp lệ. Vui lòng nạp dữ liệu chuyền may trước.',
        });
        return;
      }

      const ai = createGeminiClient();
      if (!ai) {
        res.status(503).json({
          error: 'Thiếu GEMINI_API_KEY trong .env',
        });
        return;
      }

      const userPrompt = `Dưới đây là JSON tổng hợp 3 tầng (Quý -> Khâu -> Tổ) kèm chỉ số Tài chính & Nhu cầu thị trường của xưởng may SME (${activeSummary.totalWorkers} công nhân, tổng ${compactSummary.totalRowsAggregated} dòng dữ liệu đã gộp):

${JSON.stringify(compactSummary, null, 2)}

Hãy phân tích Tổ nghẽn, Tổ lỗi cao, xu hướng hàng lỗi, giải pháp kỹ thuật/nhân sự, đồng thời giải thích rõ: (1) Chiến lược tối đa hóa lợi nhuận ròng theo bối cảnh đơn hàng & giá bán hiện tại, (2) Phân tách lợi nhuận từ mở khóa doanh thu mới vs. giảm lãng phí hàng lỗi, và (3) Cách bảo toàn sinh kế công nhân.`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_VI,
          responseMimeType: 'application/json',
          responseSchema: KAIZEN_RESPONSE_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({
          error: 'Gemini AI không trả về nội dung phân tích. Vui lòng thử lại.',
        });
        return;
      }

      const parsed = JSON.parse(rawText) as KaizenAiRecommendation;
      const optimizedSummary = normalizeOptimizedStages(
        activeSummary,
        Array.isArray(parsed.optimized_stages) ? parsed.optimized_stages : []
      );

      const actualLayoffCount = Math.max(
        0,
        activeSummary.totalWorkers - optimizedSummary.totalWorkers
      );

      const safeRecommendation: KaizenAiRecommendation = {
        bottleneck_stage_id:
          parsed.bottleneck_stage_id || activeSummary.bottleneckStageId || 'CD4',
        weakest_team_name: parsed.weakest_team_name || 'Tổ 4B',
        flagged_worker_ids: Array.isArray(parsed.flagged_worker_ids)
          ? parsed.flagged_worker_ids
          : [],
        bottleneck_and_defect_diagnosis_vi:
          parsed.bottleneck_and_defect_diagnosis_vi ||
          'Đã xác định tổ nghẽn và xu hướng tăng tỷ lệ hàng lỗi theo quý.',
        cross_team_reallocation_vi:
          parsed.cross_team_reallocation_vi ||
          'Điều chuyển nhân sự lành nghề giữa các tổ để cân bằng năng lực.',
        outlier_layoff_evaluation_vi:
          parsed.outlier_layoff_evaluation_vi ||
          'Đánh giá thay thế/tinh giản các vị trí cá biệt dưới chuẩn.',
        technical_and_quality_kaizen_vi:
          parsed.technical_and_quality_kaizen_vi ||
          'Áp dụng Gá cữ may chống lệch và kiểm tra Inline QC tại bàn.',
        profit_maximization_strategy_vi:
          parsed.profit_maximization_strategy_vi ||
          'Tối ưu biên lợi nhuận ròng bằng cách cân bằng nút thắt cổ chai theo đúng nhu cầu đơn hàng và kiểm soát hàng lỗi tại bàn.',
        revenue_vs_waste_split_vi:
          parsed.revenue_vs_waste_split_vi ||
          'Lợi nhuận tăng thêm đến từ cả hai nguồn: mở khóa sản lượng bán được khi nhu cầu cao và tiết kiệm trực tiếp chi phí NVL + công sửa hàng lỗi.',
        human_livelihood_protection_vi:
          parsed.human_livelihood_protection_vi ||
          'Bảo toàn 95%–100% việc làm công nhân thông qua điều chuyển liên tổ và đào tạo kèm gá cữ tại bàn thay vì sa thải hàng loạt.',
        recommended_layoff_count: actualLayoffCount,
        projected_defect_reduction_pct: Number.isFinite(
          Number(parsed.projected_defect_reduction_pct)
        )
          ? Math.round(Number(parsed.projected_defect_reduction_pct))
          : 40,
        estimated_roi_months:
          Number.isFinite(Number(parsed.estimated_roi_months)) &&
          Number(parsed.estimated_roi_months) > 0
            ? Number(Number(parsed.estimated_roi_months).toFixed(1))
            : 3.5,
        optimized_stages: optimizedSummary.stages.map((st) => ({
          id: st.id,
          SoLaoDong: st.SoLaoDong,
          TG_SMV: st.TG_SMV,
          HieuSuat_TB: st.HieuSuat_TB,
          TyLeLoi: st.TyLeLoi,
          WIP: st.WIP,
        })),
      };

      res.json({
        recommendation: safeRecommendation,
        optimizedSummary,
      });
    } catch (error: unknown) {
      const mapped = mapGeminiError(error, GEMINI_MODEL);
      console.error('Gemini Kaizen analysis error:', error);
      res.status(mapped.httpStatus).json({
        error: mapped.message,
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KAIZEN server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
