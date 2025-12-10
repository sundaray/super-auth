function isNextJsDynamicError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    (error as { digest: string }).digest === 'DYNAMIC_SERVER_USAGE'
  );
}
