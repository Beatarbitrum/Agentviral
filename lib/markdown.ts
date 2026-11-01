import { Marked } from "marked";
import { escapeHtml } from "./util";

const md = new Marked({ gfm: true, breaks: false });
md.use({
  renderer: {
    html(token) {
      return escapeHtml(token.text);
    },
    link(token) {
      const href = token.href || "";
      if (!/^(https?:|mailto:|\/|#)/i.test(href)) return escapeHtml(token.text);
      const text = this.parser.parseInline(token.tokens);
      const ext = /^https?:/i.test(href);
      return `<a href="${escapeHtml(href)}"${ext ? ' target="_blank" rel="noopener nofollow ugc"' : ""}>${text}</a>`;
    },
    image(token) {
      const href = token.href || "";
      if (!/^https?:/i.test(href)) return "";
      const cap = token.title ? `<figcaption>${escapeHtml(token.title)}</figcaption>` : "";
      return `<figure><img src="${escapeHtml(href)}" alt="${escapeHtml(token.text || "")}" loading="lazy" decoding="async"/>${cap}</figure>`;
    },
  },
});

export function renderMarkdown(src: string): string {
  return md.parse(src || "", { async: false }) as string;
}
