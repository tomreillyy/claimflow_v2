/**
 * Extract text content from uploaded files for full-text search indexing.
 * Supports PDF, DOCX, TXT, and CSV files. Images are skipped.
 */

const MAX_TEXT_LENGTH = 500000; // 500K chars max to keep DB rows reasonable

/**
 * @param {Buffer} buffer - File content
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<{text: string|null, status: 'completed'|'skipped'|'failed', error: string|null}>}
 */
export async function extractText(buffer, mimeType) {
  try {
    // PDF
    if (mimeType === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const result = await pdfParse(buffer);
      const text = (result.text || '').trim();
      if (!text) {
        return { text: null, status: 'completed', error: null };
      }
      return {
        text: text.slice(0, MAX_TEXT_LENGTH),
        status: 'completed',
        error: null
      };
    }

    // DOCX
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || '').trim();
      if (!text) {
        return { text: null, status: 'completed', error: null };
      }
      return {
        text: text.slice(0, MAX_TEXT_LENGTH),
        status: 'completed',
        error: null
      };
    }

    // Plain text / CSV
    if (mimeType === 'text/plain' || mimeType === 'text/csv') {
      const text = buffer.toString('utf-8').trim();
      if (!text) {
        return { text: null, status: 'completed', error: null };
      }
      return {
        text: text.slice(0, MAX_TEXT_LENGTH),
        status: 'completed',
        error: null
      };
    }

    // Images and other unsupported types — skip text extraction
    return { text: null, status: 'skipped', error: null };

  } catch (err) {
    console.error('[TextExtractor] Extraction failed:', err);
    return { text: null, status: 'failed', error: err.message };
  }
}
