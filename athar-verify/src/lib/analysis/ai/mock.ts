import { buildResult, type AiAnalysisInput, type AiAnalysisProvider, type AiAnalysisResult } from './provider';

/**
 * Deterministic stand-in for a commercial detection API.
 *
 * Used in tests and in demo environments where no real provider is connected.
 * It reports a fixed, low score and marks itself degraded so nothing downstream
 * ever treats its output as a genuine finding.
 */
export class MockAiProvider implements AiAnalysisProvider {
  readonly name = 'mock';

  async analyze(_input: AiAnalysisInput): Promise<AiAnalysisResult> {
    return buildResult({
      provider: this.name,
      degraded: true,
      signals: [
        {
          key: 'mock_provider',
          labelAr: 'مزود تجريبي',
          strength: 0,
          weight: 1,
          noteAr:
            'لم يتم توصيل مزود تحليل حقيقي. هذه نتيجة تجريبية ولا تعبّر عن فحص فعلي للملف.',
        },
      ],
    });
  }
}
