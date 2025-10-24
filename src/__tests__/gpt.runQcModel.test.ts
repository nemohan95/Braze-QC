import * as gpt from '@/lib/gpt';

// We will stub the OpenAI SDK used inside the module by monkey-patching
// the environment and the cached client via require cache manipulation.

describe('runQcModel', () => {
  const input: gpt.QcModelInput = {
    silo: 'Retail',
    entity: 'UK',
    emailType: 'marketing',
    riskRules: ['No gambling'],
    disclaimerRules: ['Include FCA footer'],
    keywordRules: [{ keyword: 'Visa', requiredText: 'Visa Europe Services Inc.' }],
    additionalRules: [
      { topic: 'Topic A', silo: 'Retail', entity: 'UK', text: 'Rule text' },
    ],
    brazePreviewUrl: 'https://example.com/preview',
    emailContent: {
      subject: 'Subject',
      preheader: 'Pre',
      bodyParagraphs: ['Para1', 'Para2'],
      ctas: [{ label: 'Click', href: 'https://example.com' }],
    },
    rawEmailHtml: '<html><body><p>Para1</p><a href="https://example.com">Click</a></body></html>',
    copyDocText: 'Copy doc text',
  };

  beforeEach(() => {
    jest.resetModules();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('sends the correct payload and parses response JSON', async () => {
    const createMock = jest.fn().mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            summary_pass: true,
            model_version: 'v1',
            checks: [
              { type: 'disclaimer', name: 'FCA footer', pass: true },
            ],
          }),
        },
      }],
    });

    // Inject a fake OpenAI client instance
    jest.doMock('openai', () => {
      return {
        __esModule: true,
        default: class OpenAIMock {
          chat = {
            completions: { create: createMock }
          };
          constructor() {}
        },
      };
    });

    // Re-import after mocking
    const { runQcModel } = await import('@/lib/gpt');

    const result = await runQcModel(input);

    expect(result.summary_pass).toBe(true);
    expect(result.model_version).toBe('v1');
    expect(result.checks[0]).toMatchObject({ type: 'disclaimer', name: 'FCA footer', pass: true });

    // Verify the payload shape passed to chat.completions.create
    expect(createMock).toHaveBeenCalledTimes(1);
    const calledWith = createMock.mock.calls[0][0];

    // Model
    expect(calledWith.model).toBe('gpt-4.1');

    // Input message structure
    expect(Array.isArray(calledWith.messages)).toBe(true);
    expect(calledWith.messages[0].role).toBe('system');
    expect(typeof calledWith.messages[0].content).toBe('string');
    expect(calledWith.messages[1].role).toBe('user');
    expect(typeof calledWith.messages[1].content).toBe('string');

    const userPayload = JSON.parse(calledWith.messages[1].content);
    expect(userPayload.context).toMatchObject({
      braze_preview_url: input.brazePreviewUrl,
      silo: input.silo,
      entity: input.entity,
      email_type: input.emailType,
    });
    expect(userPayload.email_sources).toMatchObject({
      parsed_summary: input.emailContent,
      raw_html: input.rawEmailHtml,
    });
    expect(userPayload.copy_document_text).toBe(input.copyDocText);

    // Structured output schema is provided via response_format
    expect(calledWith.response_format).toBeDefined();
    expect(calledWith.response_format.type).toBe('json_schema');
    expect(calledWith.response_format.json_schema).toBeDefined();
    expect(calledWith.response_format.json_schema.name).toBe('qc_run_report');
    expect(calledWith.response_format.json_schema.schema).toBeDefined();

    // Additional parameters
    expect(calledWith.max_tokens).toBe(2000);
    expect(calledWith.temperature).toBe(0.1);
  });
});
