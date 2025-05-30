

import { Editor, Extension } from "@tiptap/core";
import { MarkdownSerializer, MarkdownSerializerState } from "prosemirror-markdown";
import * as Prosemirror from "prosemirror-model";
import * as MarkdownIt from "markdown-it";

export interface MarkdownOptions  {
    html?: Boolean,
    tightLists?: Boolean,
    tightListClass?: String,
    bulletListMarker?: String,
    linkify?: Boolean,
    breaks?: Boolean,
    transformPastedText?: Boolean,
    transformCopiedText?: Boolean,
    ignoreRegex?: RegExp[]
}

export interface MarkdownStorage {
    options: MarkdownOptions,
    getMarkdown(): string,
}

type SpecContext<Options> = {
    options: Options,
    editor: Editor,
}

export type MarkdownNodeSpec<O = any> = {
    serialize(this: SpecContext<O>, state: MarkdownSerializerState, node: Prosemirror.Node, parent: Prosemirror.Node, index: number): void,
    parse?: {
        setup?(this: SpecContext<O>, markdownit: MarkdownIt): void,
        updateDOM?(this: SpecContext<O>, element: HTMLElement): void
    },
}

export type MarkdownMarkSpec<O = any> = {
    serialize: typeof MarkdownSerializer.prototype.marks[string] & {
        open: string | ((this: SpecContext<O>, state: MarkdownSerializerState, mark: Prosemirror.Mark, parent: Prosemirror.Node, index: number) => string);
        close: string | ((this: SpecContext<O>, state: MarkdownSerializerState, mark: Prosemirror.Mark, parent: Prosemirror.Node, index: number) => string);
    },
    parse?: {
        setup?(this: SpecContext<O>, markdownit: MarkdownIt): void,
        updateDOM?(this: SpecContext<O>, element: HTMLElement): void
    },
}

export declare const Markdown: Extension<MarkdownOptions, MarkdownStorage>;
