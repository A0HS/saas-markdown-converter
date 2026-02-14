import { NextRequest, NextResponse } from "next/server";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  LevelFormat,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ExternalHyperlink,
  TabStopPosition,
  TabStopType,
  convertInchesToTwip,
} from "docx";
import type { Node as UnistNode } from "unist";

// ── mdast node types ──

interface MdastParent extends UnistNode {
  children: MdastNode[];
}

interface MdastText extends UnistNode {
  type: "text";
  value: string;
}

interface MdastInlineCode extends UnistNode {
  type: "inlineCode";
  value: string;
}

interface MdastHeading extends MdastParent {
  type: "heading";
  depth: 1 | 2 | 3 | 4 | 5 | 6;
}

interface MdastParagraph extends MdastParent {
  type: "paragraph";
}

interface MdastBlockquote extends MdastParent {
  type: "blockquote";
}

interface MdastList extends MdastParent {
  type: "list";
  ordered: boolean;
  start?: number;
}

interface MdastListItem extends MdastParent {
  type: "listItem";
  checked?: boolean | null;
}

interface MdastCode extends UnistNode {
  type: "code";
  value: string;
  lang?: string;
}

interface MdastEmphasis extends MdastParent {
  type: "emphasis";
}

interface MdastStrong extends MdastParent {
  type: "strong";
}

interface MdastDelete extends MdastParent {
  type: "delete";
}

interface MdastLink extends MdastParent {
  type: "link";
  url: string;
}

interface MdastImage extends UnistNode {
  type: "image";
  url: string;
  alt?: string;
}

interface MdastThematicBreak extends UnistNode {
  type: "thematicBreak";
}

interface MdastTable extends MdastParent {
  type: "table";
  align?: (string | null)[];
}

interface MdastTableRow extends MdastParent {
  type: "tableRow";
}

interface MdastTableCell extends MdastParent {
  type: "tableCell";
}

interface MdastBreak extends UnistNode {
  type: "break";
}

interface MdastSuperscript extends MdastParent {
  type: "superscript";
}

interface MdastSubscript extends MdastParent {
  type: "subscript";
}

type MdastNode =
  | MdastText
  | MdastInlineCode
  | MdastHeading
  | MdastParagraph
  | MdastBlockquote
  | MdastList
  | MdastListItem
  | MdastCode
  | MdastEmphasis
  | MdastStrong
  | MdastDelete
  | MdastLink
  | MdastImage
  | MdastThematicBreak
  | MdastTable
  | MdastTableRow
  | MdastTableCell
  | MdastBreak
  | MdastSuperscript
  | MdastSubscript
  | MdastParent;

// ── Inline context (bold, italic, etc. inherited from parent) ──

interface InlineCtx {
  bold?: boolean;
  italics?: boolean;
  strike?: boolean;
  superScript?: boolean;
  subScript?: boolean;
}

// ── Helpers ──

const HEADING_MAP: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

function flattenInlineNodes(node: MdastNode, ctx: InlineCtx = {}): TextRun[] {
  switch (node.type) {
    case "text":
      return [
        new TextRun({
          text: (node as MdastText).value,
          bold: ctx.bold,
          italics: ctx.italics,
          strike: ctx.strike,
          superScript: ctx.superScript,
          subScript: ctx.subScript,
        }),
      ];

    case "strong":
      return (node as MdastStrong).children.flatMap((c) =>
        flattenInlineNodes(c, { ...ctx, bold: true })
      );

    case "emphasis":
      return (node as MdastEmphasis).children.flatMap((c) =>
        flattenInlineNodes(c, { ...ctx, italics: true })
      );

    case "delete":
      return (node as MdastDelete).children.flatMap((c) =>
        flattenInlineNodes(c, { ...ctx, strike: true })
      );

    case "superscript":
      return (node as MdastSuperscript).children.flatMap((c) =>
        flattenInlineNodes(c, { ...ctx, superScript: true })
      );

    case "subscript":
      return (node as MdastSubscript).children.flatMap((c) =>
        flattenInlineNodes(c, { ...ctx, subScript: true })
      );

    case "inlineCode":
      return [
        new TextRun({
          text: (node as MdastInlineCode).value,
          font: "Consolas",
          bold: ctx.bold,
          italics: ctx.italics,
        }),
      ];

    case "break":
      return [new TextRun({ break: 1 })];

    case "image":
      return [
        new TextRun({
          text: `[Image: ${(node as MdastImage).alt || (node as MdastImage).url}]`,
          italics: true,
          color: "888888",
        }),
      ];

    default:
      if ("children" in node && Array.isArray((node as MdastParent).children)) {
        return (node as MdastParent).children.flatMap((c) =>
          flattenInlineNodes(c, ctx)
        );
      }
      if ("value" in node) {
        return [new TextRun({ text: String((node as MdastText).value) })];
      }
      return [];
  }
}

function flattenInlineNodesForLink(
  node: MdastNode,
  ctx: InlineCtx = {}
): TextRun[] {
  return flattenInlineNodes(node, ctx).map(
    (tr) =>
      new TextRun({
        ...tr,
        style: "Hyperlink",
        color: "0563C1",
        underline: { type: "single" as const },
      } as ConstructorParameters<typeof TextRun>[0])
  );
}

// ── Block-level converter ──

function convertNodes(
  nodes: MdastNode[],
  listLevel?: number
): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "heading": {
        const h = node as MdastHeading;
        result.push(
          new Paragraph({
            heading: HEADING_MAP[h.depth],
            children: h.children.flatMap((c) => flattenInlineNodes(c)),
            spacing: { before: 240, after: 120 },
          })
        );
        break;
      }

      case "paragraph": {
        const p = node as MdastParagraph;
        // Check if paragraph contains only a link (for hyperlink support)
        const inlineChildren: (TextRun | ExternalHyperlink)[] = [];
        for (const child of p.children) {
          if (child.type === "link") {
            const link = child as MdastLink;
            inlineChildren.push(
              new ExternalHyperlink({
                link: link.url,
                children: link.children.flatMap((c) =>
                  flattenInlineNodesForLink(c)
                ),
              })
            );
          } else {
            inlineChildren.push(...flattenInlineNodes(child));
          }
        }
        result.push(
          new Paragraph({
            children: inlineChildren,
            spacing: { after: 160 },
          })
        );
        break;
      }

      case "blockquote": {
        const bq = node as MdastBlockquote;
        const inner = convertNodes(bq.children);
        for (const para of inner) {
          if (para instanceof Paragraph) {
            result.push(
              new Paragraph({
                ...para,
                indent: { left: convertInchesToTwip(0.5) },
                border: {
                  left: {
                    style: BorderStyle.SINGLE,
                    size: 6,
                    color: "BBBBBB",
                    space: 10,
                  },
                },
              } as ConstructorParameters<typeof Paragraph>[0])
            );
          } else {
            result.push(para);
          }
        }
        break;
      }

      case "list": {
        const list = node as MdastList;
        const level = listLevel ?? 0;
        for (let i = 0; i < list.children.length; i++) {
          const item = list.children[i] as MdastListItem;

          // Checkbox prefix
          let checkPrefix = "";
          if (item.checked === true) checkPrefix = "☑ ";
          else if (item.checked === false) checkPrefix = "☐ ";

          for (let j = 0; j < item.children.length; j++) {
            const child = item.children[j];
            if (child.type === "paragraph") {
              const p = child as MdastParagraph;
              const runs = p.children.flatMap((c) => flattenInlineNodes(c));
              if (j === 0 && checkPrefix) {
                runs.unshift(new TextRun({ text: checkPrefix }));
              }
              result.push(
                new Paragraph({
                  children: runs,
                  numbering: {
                    reference: list.ordered ? "ordered-list" : "bullet-list",
                    level: level,
                  },
                  spacing: { after: 80 },
                })
              );
            } else if (child.type === "list") {
              result.push(...convertNodes([child], level + 1));
            } else {
              result.push(...convertNodes([child], level));
            }
          }
        }
        break;
      }

      case "code": {
        const code = node as MdastCode;
        const lines = code.value.split("\n");
        for (const line of lines) {
          result.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line || " ",
                  font: "Consolas",
                  size: 20,
                }),
              ],
              shading: { fill: "F4F4F4" },
              spacing: { after: 0 },
            })
          );
        }
        result.push(new Paragraph({ spacing: { after: 160 } }));
        break;
      }

      case "table": {
        const table = node as MdastTable;
        const rows = table.children as MdastTableRow[];
        const docxRows = rows.map((row, rowIdx) => {
          const cells = (row.children as MdastTableCell[]).map((cell) => {
            const runs = cell.children.flatMap((c) => flattenInlineNodes(c));
            if (rowIdx === 0) {
              runs.forEach((r) => {
                // Bold header cells - reconstruct with bold
              });
              return new TableCell({
                children: [
                  new Paragraph({
                    children: cell.children.flatMap((c) =>
                      flattenInlineNodes(c, { bold: true })
                    ),
                  }),
                ],
                shading: { fill: "F4F4F4" },
              });
            }
            return new TableCell({
              children: [new Paragraph({ children: runs })],
            });
          });
          return new TableRow({ children: cells });
        });
        result.push(
          new Table({
            rows: docxRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        );
        result.push(new Paragraph({ spacing: { after: 160 } }));
        break;
      }

      case "thematicBreak": {
        result.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "\t",
              }),
            ],
            border: {
              bottom: {
                style: BorderStyle.SINGLE,
                size: 6,
                color: "CCCCCC",
                space: 1,
              },
            },
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: TabStopPosition.MAX,
              },
            ],
            spacing: { before: 240, after: 240 },
          })
        );
        break;
      }

      default: {
        // Recurse into unknown parent nodes
        if ("children" in node && Array.isArray((node as MdastParent).children)) {
          result.push(...convertNodes((node as MdastParent).children, listLevel));
        }
        break;
      }
    }
  }

  return result;
}

// ── Route handler ──

export async function POST(request: NextRequest) {
  try {
    const { markdown } = await request.json();

    if (!markdown || typeof markdown !== "string") {
      return NextResponse.json(
        { error: "Markdown content is required" },
        { status: 400 }
      );
    }

    // Parse markdown to AST
    const tree = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .parse(markdown) as MdastParent;

    // Convert AST to docx elements
    const docxElements = convertNodes(tree.children);

    // Build document
    const doc = new Document({
      numbering: {
        config: [
          {
            reference: "bullet-list",
            levels: Array.from({ length: 9 }, (_, i) => ({
              level: i,
              format: LevelFormat.BULLET,
              text: i % 3 === 0 ? "\u2022" : i % 3 === 1 ? "\u25E6" : "\u2013",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: convertInchesToTwip(0.5 * (i + 1)), hanging: convertInchesToTwip(0.25) } } },
            })),
          },
          {
            reference: "ordered-list",
            levels: Array.from({ length: 9 }, (_, i) => ({
              level: i,
              format: i % 3 === 0 ? LevelFormat.DECIMAL : i % 3 === 1 ? LevelFormat.LOWER_LETTER : LevelFormat.LOWER_ROMAN,
              text: i % 3 === 0 ? `%${i + 1}.` : i % 3 === 1 ? `%${i + 1})` : `%${i + 1}.`,
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: convertInchesToTwip(0.5 * (i + 1)), hanging: convertInchesToTwip(0.25) } } },
            })),
          },
        ],
      },
      sections: [
        {
          properties: {},
          children: docxElements,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="converted.docx"',
      },
    });
  } catch (error) {
    console.error("Conversion error:", error);
    return NextResponse.json(
      { error: "Failed to convert markdown to docx" },
      { status: 500 }
    );
  }
}
