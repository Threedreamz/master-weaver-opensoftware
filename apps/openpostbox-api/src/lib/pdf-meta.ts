/**
 * Cheap page-count extractor. Counts `/Type /Page` object markers in a PDF.
 *
 * This is a pragmatic heuristic — not a full PDF parser. It handles the
 * overwhelming majority of well-formed PDFs produced by scanners (ScanSnap
 * iX1600 included). For malformed or heavily compressed PDFs the worker
 * will re-derive page count during OCR and PATCH the row.
 */
export function estimatePdfPageCount(buffer: Buffer): number {
  const haystack = buffer.toString("latin1");
  const matches = haystack.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 1;
}
