import sanitizeHtml from "sanitize-html";

/**
 * Sanitizes rich-text HTML produced by the forum's Tiptap editor before it is stored.
 *
 * The client renders comment HTML with dangerouslySetInnerHTML, so anything stored here
 * reaches every viewer's browser (including admins). Requests can bypass the editor and
 * hit the API directly, so the server is the source of truth: only the tags/attributes
 * the editor can actually produce are allowed (StarterKit, TextStyle, Color, FontFamily,
 * Highlight, TextAlign). Scripts, event handlers (onerror=...), iframes and
 * javascript: URLs are stripped.
 */
const COLOR = [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "b", "em", "i", "u", "s", "code", "pre", "blockquote",
    "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "hr", "a", "span", "mark",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    span: ["style"],
    mark: ["style", "data-color"],
    p: ["style"],
    h1: ["style"], h2: ["style"], h3: ["style"], h4: ["style"], h5: ["style"], h6: ["style"],
  },
  allowedStyles: {
    "*": {
      color: COLOR,
      "background-color": COLOR,
      "font-family": [/^[\w\s,"'-]+$/],
      "text-align": [/^(left|right|center|justify)$/],
    },
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  // Links always open safely in a new tab, regardless of what the request sent.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }),
  },
};

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
