/** Domain-level error mapped to an HTTP status by the error handler. */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
