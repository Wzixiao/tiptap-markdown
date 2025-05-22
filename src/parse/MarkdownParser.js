import markdownit from "markdown-it";

import { elementFromString, extractElement, unwrapElement } from "../util/dom";
import { getMarkdownSpec } from "../util/extensions";

export class MarkdownParser {
  /**
   * @type {import('@tiptap/core').Editor}
   */
  editor = null;
  /**
   * @type {markdownit}
   */
  md = null;

  constructor(editor, { html, linkify, breaks, ignoreRegex }) {
    this.editor = editor;
    this.md = this.withPatchedRenderer(
      markdownit({
        html,
        linkify,
        breaks,
      })
    );
    this.ignoreRegex = ignoreRegex;
  }

  parse(content, { inline } = {}) {
    if (typeof content === "string") {
      let processedContent = content;

      const placeholders = new Map();

      let placeholderIndex = 0;

      for (const regex of this.ignoreRegex) {
        processedContent = processedContent.replace(regex, (match) => {
          const placeholder = `IGNORE_${placeholderIndex}`;
          placeholders.set(placeholder, match);
          placeholderIndex++;
          return placeholder;
        });
      }

      this.editor.extensionManager.extensions.forEach((extension) =>
        getMarkdownSpec(extension)?.parse?.setup?.call({ editor: this.editor, options: extension.options }, this.md)
      );

      const renderedHTML = this.md.render(processedContent);

      const element = elementFromString(renderedHTML);

      this.editor.extensionManager.extensions.forEach((extension) =>
        getMarkdownSpec(extension)?.parse?.updateDOM?.call({ editor: this.editor, options: extension.options }, element)
      );

      let finalHTML = element.innerHTML;

      const entries = Array.from(placeholders.entries());
      for (let i = entries.length - 1; i >= 0; i--) {
        const [placeholder, original] = entries[i];
        finalHTML = finalHTML.split(placeholder).join(original);
      }

      const finalElement = elementFromString(finalHTML);
      this.normalizeDOM(finalElement, { inline, content });

      return finalElement.innerHTML;
    }

    return content;
  }

  normalizeDOM(node, { inline, content }) {
    this.normalizeBlocks(node);

    // remove all \n appended by markdown-it
    node.querySelectorAll("*").forEach((el) => {
      if (el.nextSibling?.nodeType === Node.TEXT_NODE && !el.closest("pre")) {
        el.nextSibling.textContent = el.nextSibling.textContent.replace(/^\n/, "");
      }
    });

    if (inline) {
      this.normalizeInline(node, content);
    }

    return node;
  }

  normalizeBlocks(node) {
    const blocks = Object.values(this.editor.schema.nodes).filter((node) => node.isBlock);

    const selector = blocks
      .map((block) => block.spec.parseDOM?.map((spec) => spec.tag))
      .flat()
      .filter(Boolean)
      .join(",");

    if (!selector) {
      return;
    }

    [...node.querySelectorAll(selector)].forEach((el) => {
      if (el.parentElement.matches("p")) {
        extractElement(el);
      }
    });
  }

  normalizeInline(node, content) {
    if (node.firstElementChild?.matches("p")) {
      const firstParagraph = node.firstElementChild;
      const { nextElementSibling } = firstParagraph;
      const startSpaces = content.match(/^\s+/)?.[0] ?? "";
      const endSpaces = !nextElementSibling ? (content.match(/\s+$/)?.[0] ?? "") : "";

      if (content.match(/^\n\n/)) {
        firstParagraph.innerHTML = `${firstParagraph.innerHTML}${endSpaces}`;
        return;
      }

      unwrapElement(firstParagraph);

      node.innerHTML = `${startSpaces}${node.innerHTML}${endSpaces}`;
    }
  }

  /**
   * @param {markdownit} md
   */
  withPatchedRenderer(md) {
    const withoutNewLine =
      (renderer) =>
      (...args) => {
        const rendered = renderer(...args);
        if (rendered === "\n") {
          return rendered; // keep soft breaks
        }
        if (rendered[rendered.length - 1] === "\n") {
          return rendered.slice(0, -1);
        }
        return rendered;
      };

    md.renderer.rules.hardbreak = withoutNewLine(md.renderer.rules.hardbreak);
    md.renderer.rules.softbreak = withoutNewLine(md.renderer.rules.softbreak);
    md.renderer.rules.fence = withoutNewLine(md.renderer.rules.fence);
    md.renderer.rules.code_block = withoutNewLine(md.renderer.rules.code_block);
    md.renderer.renderToken = withoutNewLine(md.renderer.renderToken.bind(md.renderer));

    return md;
  }
}
