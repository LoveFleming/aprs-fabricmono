/**
 * HelloWorld Node - AI Factory Demo
 * A simple greeting node demonstrating Input/Output Contract patterns
 */

// Input Contract
type Language = 'en' | 'zh' | 'ja' | 'es';

interface HelloWorldInput {
  traceId: string;
  name?: string;
  language?: Language;
}

// Output Contract
interface HelloWorldOutput {
  traceId: string;
  greeting: string;
  message: string;
  language: string;
  timestamp: string;
  nodeInfo: {
    nodeId: string;
    version: string;
    factory: string;
  };
}

// Error Codes (following factory naming convention: BIZ_ / SYS_ / EXT_ / ORCH_)
const ERROR_CODES = {
  INVALID_REQUEST: 'BIZ_HELLO_WORLD_REQUEST_INVALID',
  PROCESSING_FAILED: 'SYS_HELLO_WORLD_PROCESSING_FAILED',
} as const;

// Greeting phrases by language
const GREETINGS: Record&lt;Language, string&gt; = {
  en: 'Hello',
  zh: '你好',
  ja: 'こんにちは',
  es: '¡Hola',
};

/**
 * HelloWorld Processor
 * Implements the core business logic
 */
export class HelloWorldProcessor {
  private readonly nodeId = 'hello-world-node';
  private readonly version = '1.0.0';
  private readonly factory = 'ai-factory';

  /**
n   * Process greeting request
   * @param input - Validated input matching Input Contract
   * @returns Output matching Output Contract
   */
  public process(input: HelloWorldInput): HelloWorldOutput {
    // Validate input (Quality Gate check)
    if (!input.traceId || input.traceId.length === 0) {
      throw new HelloWorldError(
        ERROR_CODES.INVALID_REQUEST,
        'traceId is required'
      );
    }

    const name = input.name?.trim() || 'World';
    const language = input.language || 'en';
    const greetingPhrase = GREETINGS[language] || GREETINGS.en;

    // Construct output following Output Contract
    return {
      traceId: input.traceId,
      greeting: greetingPhrase,
      message: `${greetingPhrase}, ${name}! Welcome to AI Software Factory 🏭`,
      language,
      timestamp: new Date().toISOString(),
      nodeInfo: {
        nodeId: this.nodeId,
        version: this.version,
        factory: this.factory,
      },
    };
  }

  /**
   * Health check endpoint
   */
  public health(): { status: 'healthy' | 'unhealthy'; nodeId: string } {
    return {
      status: 'healthy',
      nodeId: this.nodeId,
    };
  }
}

/**
 * Custom Error for HelloWorld Node
 */
class HelloWorldError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'HelloWorldError';
  }
}

// Export singleton instance
export const helloWorldProcessor = new HelloWorldProcessor();