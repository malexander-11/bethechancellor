/** Raised when a data file fails schema or consistency validation. */
export class DataError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(issues.length > 0 ? `${message}\n - ${issues.join('\n - ')}` : message);
    this.name = 'DataError';
    this.issues = issues;
  }
}

/** Raised when the engine is asked to do something the data does not support. */
export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineError';
  }
}
