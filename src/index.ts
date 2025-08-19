import type {KnownBlock} from '@slack/types';
import {parseBlocks} from './parser/internal';
import type {ParsingOptions} from './types';
import {marked} from 'marked';

/**
 * Parses Markdown content into Slack BlockKit Blocks.
 * - Supports headings (all Markdown heading levels are treated as the single Slack header block)
 * - Supports numbered lists, bulleted lists, to-do lists
 * - Supports italics, bold, strikethrough, inline code, hyperlinks
 * - Supports images
 * - Supports thematic breaks / dividers
 *
 * Per Slack limitations, these markdown attributes are not completely supported:
 * - Tables: they will be copied but Slack will render them as text
 * - Block quotes (limited functionality; does not support lists, headings, or images within the block quote)
 *
 * Supports GitHub-flavoured Markdown.
 *
 * @param body any Markdown or GFM content
 * @param options options to configure the parser
 */
export async function markdownToBlocks(
  body: string,
  options: ParsingOptions = {}
): Promise<KnownBlock[]> {
  // Slack only wants &, <, and > escaped
  // https://api.slack.com/reference/surfaces/formatting#escaping
  const replacements: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
  };

  // Disable marked's default HTML encoding behavior
  const markedOptions: marked.MarkedOptions = {
    pedantic: false,
    gfm: true,
    breaks: false,
    sanitize: false,
    smartypants: false,
    xhtml: false,
  };

  const lexer = new marked.Lexer(markedOptions);
  lexer.options.tokenizer = new marked.Tokenizer();
  lexer.options.tokenizer.inlineText = src => {
    const text = src.replace(/[&<>]/g, char => {
      return replacements[char];
    });

    return {
      type: 'text',
      raw: src,
      text: text,
    };
  };

  const tokens = lexer.lex(body);

  const blocks = parseBlocks(tokens, options);

  // Decode HTML entities that shouldn't be encoded for Slack
  return decodeBlockEntities(blocks);
}

// Decode HTML entities that marked incorrectly encodes
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x2F;/g, '/')
    .replace(/&#96;/g, '`');
  // Note: We don't decode &amp;, &lt;, &gt; as those should remain encoded for Slack
}

// Recursively decode HTML entities in Slack blocks
function decodeBlockEntities(blocks: KnownBlock[]): KnownBlock[] {
  return blocks.map(block => {
    // Create a shallow copy to avoid mutating the original
    const decoded: KnownBlock = {...block};

    // Decode text in section blocks
    if (decoded.type === 'section' && decoded.text?.text) {
      decoded.text = {
        ...decoded.text,
        text: decodeHtmlEntities(decoded.text.text),
      };
    }

    // Decode text in header blocks
    if (decoded.type === 'header' && decoded.text?.text) {
      decoded.text = {
        ...decoded.text,
        text: decodeHtmlEntities(decoded.text.text),
      };
    }

    // Decode text in fields (for section blocks)
    if (decoded.type === 'section' && decoded.fields) {
      decoded.fields = decoded.fields.map(field => {
        if (typeof field === 'object' && field.text) {
          return {
            ...field,
            text: decodeHtmlEntities(field.text),
          };
        }
        return field;
      });
    }

    return decoded;
  });
}
