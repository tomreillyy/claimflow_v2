'use client';

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content for safe rendering via dangerouslySetInnerHTML.
 * Strips scripts, event handlers, and other XSS vectors while preserving
 * safe formatting tags used by the Tiptap editor and AI-generated content.
 */
export function sanitizeHtml(dirty) {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'u', 'em', 'strong', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div', 'hr',
      'sub', 'sup', 'mark', 'del', 's',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class', 'colspan', 'rowspan'],
    ALLOW_DATA_ATTR: false,
  });
}
