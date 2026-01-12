import { h } from './vdom.js';

/**
 * Simple HTML template parser using regex for template literals.
 *
 * Supports:
 * - Standard HTML elements and custom elements with hyphens
 * - Attributes with hyphens (data-*, aria-*)
 * - Escaped quotes in attribute values (\")
 * - Semi-intelligent whitespace handling: preserves spaces between inline elements
 *
 * Limitations:
 * - No HTML comments or CDATA sections
 * - No HTML entity decoding (&lt;, &gt;, etc.)
 * - Assumes well-formed developer-written templates
 *
 */

// Matches opening tag, attributes, content, and closing tag
// Example: <div class="foo">content</div>
const TAG_REGEX = /^<([\w-]+)([^>]*)>(.*)<\/\1>$/s;

// Matches self-closing tags
// Example: <input type="text" /> or <br>
const SELF_CLOSING_TAG_REGEX = /^<([\w-]+)([^>]*)\/?>$/;

// Matches attribute name and value (quoted or unquoted)
// Handles escaped quotes: \"
const ATTR_REGEX = /([\w-]+)(?:=(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\S+)))?/g;

// Placeholder for interpolated values in template
const PLACEHOLDER_REGEX = /__PLACEHOLDER_(\d+)__/g;

// Matches opening tag (for child parsing)
const OPEN_TAG_REGEX = /^<([\w-]+)([^>]*)>/;

export function html(strings, ...values) {
  const parts = [strings[0]];

  for (let i = 0; i < values.length; i++) {
    parts.push(`__PLACEHOLDER_${i}__`, strings[i + 1]);
  }

  return parseHTML(parts.join(''), values);
}

function parseHTML(htmlString, values) {
  const trimmed = htmlString.trim();

  const tagMatch = trimmed.match(TAG_REGEX) ||
                   trimmed.match(SELF_CLOSING_TAG_REGEX);

  if (!tagMatch) {
    return processTextNode(trimmed, values);
  }

  const tagName = tagMatch[1];
  const attrsString = tagMatch[2] || '';
  const innerHTML = tagMatch[3];

  const props = parseAttributes(attrsString, values);

  if (!innerHTML) {
    return h(tagName, props);
  }

  const children = parseChildren(innerHTML, values);
  return h(tagName, props, ...children);
}

function parseAttributes(attrsString, values) {
  const props = {};
  let match;

  ATTR_REGEX.lastIndex = 0;
  while ((match = ATTR_REGEX.exec(attrsString)) !== null) {
    const [, name, doubleQuoted, singleQuoted, unquoted] = match;
    const value = doubleQuoted ?? singleQuoted ?? unquoted;

    if (!value) {
      props[name] = true;
      continue;
    }

    const placeholderMatch = value.match(/^__PLACEHOLDER_(\d+)__$/);
    if (placeholderMatch) {
      const index = parseInt(placeholderMatch[1]);
      props[name] = values[index];
    } else {
      props[name] = interpolateString(value, values);
    }
  }

  return props;
}

function parseChildren(innerHTML, values) {
  const children = [];
  let pos = 0;
  const input = innerHTML.trim();

  function addTextNode(text) {
    const textNode = processTextNode(text, values);
    if (!textNode) return;

    if (Array.isArray(textNode)) {
      children.push(...textNode);
    } else {
      children.push(textNode);
    }
  }

  function findMatchingClose(tagName, startPos) {
    // Note: This simple approach may fail if tag name appears in text content
    // or attributes (e.g., <div title="<div>">). For this use case (developer
    // templates), it's acceptable. For arbitrary HTML, use a proper parser.
    const closeTag = `</${tagName}>`;
    let depth = 1;
    let searchPos = startPos;

    while (depth > 0 && searchPos < input.length) {
      const nextOpen = input.indexOf(`<${tagName}`, searchPos);
      const nextClose = input.indexOf(closeTag, searchPos);

      if (nextClose === -1) return -1;

      if (nextOpen !== -1 && nextOpen < nextClose && input[nextOpen + tagName.length + 1] !== '/') {
        depth++;
        searchPos = nextOpen + tagName.length + 1;
      } else {
        depth--;
        if (depth === 0) return nextClose;
        searchPos = nextClose + closeTag.length;
      }
    }

    return -1;
  }

  while (pos < input.length) {
    const tagStart = input.indexOf('<', pos);

    if (tagStart === -1) {
      addTextNode(input.slice(pos));
      break;
    }

    if (tagStart > pos) {
      addTextNode(input.slice(pos, tagStart));
      pos = tagStart;
    }

    const tagMatch = input.slice(pos).match(OPEN_TAG_REGEX);
    if (!tagMatch) {
      pos++;
      continue;
    }

    const fullOpenTag = tagMatch[0];
    const tagName = tagMatch[1];

    if (fullOpenTag.endsWith('/>')) {
      children.push(parseHTML(fullOpenTag, values));
      pos += fullOpenTag.length;
      continue;
    }

    const closeTagPos = findMatchingClose(tagName, pos + fullOpenTag.length);
    if (closeTagPos === -1) {
      pos += fullOpenTag.length;
      continue;
    }

    const closeTag = `</${tagName}>`;
    const fullElement = input.slice(pos, closeTagPos + closeTag.length);
    children.push(parseHTML(fullElement, values));
    pos = closeTagPos + closeTag.length;
  }

  return children;
}

function processTextNode(text, values) {
  // Smart whitespace handling:
  // - Collapse multiple whitespace chars (including newlines) into single space
  // - Preserve single spaces between words
  // - Trim only if the entire text is whitespace
  // - Pure whitespace text nodes are removed
  const normalized = text.replace(/\s+/g, ' ');
  const trimmed = normalized.trim();

  if (!trimmed) return null;

  // Preserve leading/trailing spaces if they existed in normalized form
  // but only if there's actual content (not just whitespace)
  const hasLeadingSpace = normalized.startsWith(' ') && normalized !== ' ';
  const hasTrailingSpace = normalized.endsWith(' ') && normalized !== ' ';

  const textToProcess = (hasLeadingSpace ? ' ' : '') + trimmed + (hasTrailingSpace ? ' ' : '');

  const parts = [];
  let lastIndex = 0;
  let match;
  let hasPlaceholder = false;

  PLACEHOLDER_REGEX.lastIndex = 0;
  while ((match = PLACEHOLDER_REGEX.exec(textToProcess)) !== null) {
    hasPlaceholder = true;

    if (match.index > lastIndex) {
      parts.push(textToProcess.slice(lastIndex, match.index));
    }

    const index = parseInt(match[1]);
    const value = values[index];

    if (Array.isArray(value)) {
      parts.push(...value);
    } else if (value && typeof value === 'object' && value.type) {
      parts.push(value);
    } else if (value !== null && value !== undefined) {
      parts.push(String(value));
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < textToProcess.length) {
    parts.push(textToProcess.slice(lastIndex));
  }

  if (parts.length === 0) {
    return hasPlaceholder ? null : textToProcess;
  }

  return parts.length === 1 ? parts[0] : parts;
}

function interpolateString(str, values) {
  PLACEHOLDER_REGEX.lastIndex = 0;
  return str.replace(PLACEHOLDER_REGEX, (_match, indexStr) => {
    const index = parseInt(indexStr);
    const value = values[index];
    return value ?? '';
  });
}
