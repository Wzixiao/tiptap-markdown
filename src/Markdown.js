import { Extension, extensions } from "@tiptap/core";

import { MarkdownClipboard } from "./extensions/tiptap/clipboard";
import { MarkdownTightLists } from "./extensions/tiptap/tight-lists";
import { MarkdownParser } from "./parse/MarkdownParser";
import { MarkdownSerializer } from "./serialize/MarkdownSerializer";

export const Markdown = Extension.create({
  name: "markdown",
  priority: 50,
  addOptions() {
    return {
      html: true,
      tightLists: true,
      tightListClass: "tight",
      bulletListMarker: "-",
      linkify: false,
      breaks: false,
      transformPastedText: false,
      transformCopiedText: false,
      ignoreRegex: [],
    };
  },
  addCommands() {
    const commands = extensions.Commands.config.addCommands();
    return {
      setContent: (content, emitUpdate, parseOptions) => (props) => {
        return commands.setContent(
          props.editor.storage.markdown.parser.parse(content),
          emitUpdate,
          parseOptions
        )(props);
      },
      insertContentAt: (range, content, options) => (props) => {
        return commands.insertContentAt(
          range,
          props.editor.storage.markdown.parser.parse(content, { inline: true }),
          options
        )(props);
      },
    };
  },
  onBeforeCreate() {
    this.editor.storage.markdown = {
      options: { ...this.options },
      parser: new MarkdownParser(this.editor, this.options, this.options.ignoreRegex),
      serializer: new MarkdownSerializer(this.editor),
      getMarkdown: () => {
        return this.editor.storage.markdown.serializer.serialize(this.editor.state.doc);
      },
    };
    this.editor.options.initialContent = this.editor.options.content;
    this.editor.options.content = this.editor.storage.markdown.parser.parse(this.editor.options.content);
  },
  onCreate() {
    this.editor.options.content = this.editor.options.initialContent;
    delete this.editor.options.initialContent;
  },
  addStorage() {
    return {
      /// storage will be defined in onBeforeCreate() to prevent initial object overriding
    };
  },
  addExtensions() {
    return [
      MarkdownTightLists.configure({
        tight: this.options.tightLists,
        tightClass: this.options.tightListClass,
      }),
      MarkdownClipboard.configure({
        transformPastedText: this.options.transformPastedText,
        transformCopiedText: this.options.transformCopiedText,
      }),
    ];
  },
});
