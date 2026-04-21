/**
 * OCR job — pulls a PDF from the blob store, runs Tesseract (or a cloud
 * OCR), writes `ocrText` + `pageCount` back to openpostbox-api via PATCH
 * /api/scans/:id, then enqueues a classify job.
 *
 * MVP stub: this handler logs the payload and marks the job done. Wire up
 * the real OCR + PATCH call in a follow-up.
 */

export interface OcrJobData {
  tenantId: string;
  mailId: string;
  blobUrl: string;
}

export interface OcrJobResult {
  mailId: string;
  ocrTextLength: number;
  pageCount: number;
}

export async function processOcr(data: OcrJobData): Promise<OcrJobResult> {
  console.log(`[ocr] processing mail=${data.mailId} blob=${data.blobUrl}`);
  // TODO: download blobUrl, run tesseract/cloud OCR, PATCH /api/scans/:id
  return { mailId: data.mailId, ocrTextLength: 0, pageCount: 0 };
}
