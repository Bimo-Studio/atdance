/** Thrown when `.dance` parsing fails; `line` is 1-based in the source file. */
export class ParseError extends Error {
  override readonly name = 'ParseError';

  constructor(
    readonly line: number,
    message: string,
  ) {
    super(`Line ${line}: ${message}`);
  }
}
