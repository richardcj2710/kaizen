import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import { enforceZeroLayoffInvariant, simulateLine } from './src/utils/simulation.ts';
import type { KaizenAiRecommendation, StationInput } from './src/types/kaizen.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

const SYSTEM_INSTRUCTION_VI = `Bạn là Chuyên gia Kỹ thuật Công nghiệp (IE - Industrial Engineering) và Lean Manufacturing chuyên sâu trong ngành may mặc gia công vừa và nhỏ (tập trung giai đoạn B10 May theo bó, B11 QC, B12 Đóng khuy/ủi/đóng gói).

Khi phân tích dữ liệu chuyền may hiện trạng, bạn PHẢI tuân thủ tuyệt đối 3 nguyên tắc nhân văn và thực tiễn sau:
(a) TUYỆT ĐỐI KHÔNG ĐỀ XUẤT SA THẢI CÔNG NHÂN (0% sa thải). Tổng số lao động (SoLaoDong) trên toàn chuyền sau tối ưu PHẢI BẰNG CHÍNH XÁC tổng số lao động hiện tại.
(b) TUYỆT ĐỐI KHÔNG đề xuất các giải pháp viển vông như robot hình người (humanoid robots) hay tự động hóa toàn nhà máy phi thực tế. Thay vào đó, hãy đề xuất cải tiến kỹ thuật đặc thù ngành may như "Gá cữ may" (Jig/Template sewing), chân vịt chuyên dùng, hoặc "Máy chuyên dùng lập trình tự động" (ví dụ: máy đơm nút/thùa khuyết tự động, máy lập trình túi/cổ) ở các công đoạn phù hợp để giảm TG_SMV.
(c) Điều chuyển hợp lý công nhân từ các công đoạn đang dư thừa năng suất (over-capacity) sang hỗ trợ công đoạn nút thắt cổ chai (bottleneck) hoặc công đoạn đòi hỏi kỹ năng cao, đồng thời dự báo mức giảm hàng tồn bán thành phẩm (WIP) thực tế.

Tất cả các trường giải thích tiếng Việt phải rõ ràng, cụ thể cho quản đốc xưởng may đọc và áp dụng ngay, giữ nguyên id của từng công đoạn trong optimized_stations.`;

const KAIZEN_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    bottleneck_id: {
      type: Type.STRING,
      description: 'Mã id của công đoạn đang là nút thắt cổ chai lớn nhất.',
    },
    root_cause_vi: {
      type: Type.STRING,
      description: 'Phân tích nguyên nhân gốc rễ gây nghẽn chuyền và ứ đọng WIP bằng tiếng Việt.',
    },
    human_reallocation_vi: {
      type: Type.STRING,
      description:
        'Phương án điều chuyển nhân sự cụ thể giữa các công đoạn (cam kết 0% sa thải, tổng số lao động không đổi).',
    },
    technical_kaizen_vi: {
      type: Type.STRING,
      description:
        'Đề xuất cải tiến kỹ thuật ngành may thực tế (Gá cữ may, chân vịt, máy chuyên dùng lập trình tự động).',
    },
    estimated_roi_months: {
      type: Type.NUMBER,
      description: 'Thời gian ước tính hoàn vốn đầu tư thiết bị/gá cữ tính theo số tháng (ví dụ: 4.5).',
    },
    optimized_stations: {
      type: Type.ARRAY,
      description: 'Danh sách toàn bộ các công đoạn sau khi điều chuyển lao động và áp dụng Kaizen.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          SoLaoDong: { type: Type.INTEGER },
          TG_SMV: { type: Type.NUMBER },
          WIP: { type: Type.INTEGER },
        },
        required: ['id', 'SoLaoDong', 'TG_SMV', 'WIP'],
      },
    },
  },
  required: [
    'bottleneck_id',
    'root_cause_vi',
    'human_reallocation_vi',
    'technical_kaizen_vi',
    'estimated_roi_months',
    'optimized_stations',
  ],
};

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
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
    });
  });

  app.post('/api/kaizen/analyze', async (req, res) => {
    try {
      const rawStations = req.body?.stations as StationInput[] | undefined;
      if (!Array.isArray(rawStations) || rawStations.length === 0) {
        res.status(400).json({
          error: 'Dữ liệu chuyền may không hợp lệ. Vui lòng nạp ít nhất 1 công đoạn.',
        });
        return;
      }

      const ai = createGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'Chưa cấu hình GEMINI_API_KEY trên máy chủ. Vui lòng kiểm tra khóa API trong Settings > Secrets.',
        });
        return;
      }

      const currentSim = simulateLine(rawStations);
      const userPrompt = `Dưới đây là dữ liệu hiện trạng của chuyền may gồm ${rawStations.length} công đoạn (Tổng số công nhân hiện có: ${currentSim.totalWorkers} người; Năng suất chuyền hiện tại: ${currentSim.lineThroughput} sp/giờ; Tổng WIP: ${currentSim.totalWip} sp; Công đoạn nghẽn hiện tại: ${currentSim.bottleneckId}).

Hãy phân tích và đề xuất phương án cân bằng chuyền Kaizen nhân văn (giữ nguyên tổng số ${currentSim.totalWorkers} công nhân, không sa thải bất kỳ ai):
${JSON.stringify(currentSim.stations, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: userPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_VI,
          responseMimeType: 'application/json',
          responseSchema: KAIZEN_RESPONSE_SCHEMA,
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
      const normalizedStations = enforceZeroLayoffInvariant(
        rawStations,
        Array.isArray(parsed.optimized_stations) ? parsed.optimized_stations : []
      );

      const safeRecommendation: KaizenAiRecommendation = {
        bottleneck_id: parsed.bottleneck_id || currentSim.bottleneckId || rawStations[0].id,
        root_cause_vi: parsed.root_cause_vi || 'Chưa có mô tả nguyên nhân.',
        human_reallocation_vi: parsed.human_reallocation_vi || 'Giữ nguyên nhân sự và hỗ trợ trạm nghẽn.',
        technical_kaizen_vi: parsed.technical_kaizen_vi || 'Áp dụng gá cữ định hình tại công đoạn nghẽn.',
        estimated_roi_months:
          Number.isFinite(Number(parsed.estimated_roi_months)) && Number(parsed.estimated_roi_months) > 0
            ? Number(Number(parsed.estimated_roi_months).toFixed(1))
            : 4.0,
        optimized_stations: normalizedStations.map((s) => ({
          id: s.id,
          SoLaoDong: s.SoLaoDong,
          TG_SMV: s.TG_SMV,
          WIP: s.WIP,
        })),
      };

      res.json({
        recommendation: safeRecommendation,
        optimizedLine: normalizedStations,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Lỗi không xác định khi gọi Gemini AI.';
      console.error('Gemini Kaizen analysis error:', error);
      res.status(500).json({
        error: `Không thể hoàn tất phân tích Gemini AI: ${message}`,
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
