import React, { useState } from 'react';
import { Copy, Check, FileText } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  onCitationClick?: (pageNumber: number, docName?: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onCitationClick }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to format inline citations and inline styles
  const renderInline = (text: string): React.ReactNode => {
    // Regex for various citation patterns:
    // 1. [Document.pdf · p.3] or [Document.pdf · Page 3] or [Document.pdf, Page 3]
    // 2. (Source: Document.pdf, Page 3) or (Document.pdf, Page 3)
    // 3. [Page 3] or [p. 3] or (Page 3)
    const citationRegex =
      /(\[(?:Source:\s*)?([a-zA-Z0-9_\-.]+\.pdf|[a-zA-Z0-9_\- ]+)?(?:\s*[·•,]\s*|\s+)(?:Page|p\.)\s*(\d+)(?:[-–](\d+))?\]|\((?:Source:\s*)?([a-zA-Z0-9_\-.]+\.pdf|[a-zA-Z0-9_\- ]+)?(?:\s*[·•,]\s*|\s+)(?:Page|p\.)\s*(\d+)(?:[-–](\d+))?\)|\[(?:Page|p\.)\s*(\d+)\]|\((?:Page|p\.)\s*(\d+)\))/gi;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = citationRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(renderBasicFormatting(text.substring(lastIndex, match.index)));
      }

      // Extract matched doc name and page number
      let docName = match[2] || match[5];
      if (docName) {
        docName = docName.trim();
      }
      const pageStr = match[3] || match[6] || match[7] || match[8] || '1';
      const pageNum = parseInt(pageStr, 10);
      const endPageStr = match[4];

      const label = docName
        ? `${docName} · p.${pageNum}${endPageStr ? `–${endPageStr}` : ''}`
        : `p.${pageNum}${endPageStr ? `–${endPageStr}` : ''}`;

      parts.push(
        <button
          key={`cite-${match.index}`}
          onClick={(e) => {
            e.stopPropagation();
            onCitationClick?.(pageNum, docName);
          }}
          className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/70 dark:hover:bg-brand-900/90 dark:text-brand-300 border border-brand-200/80 dark:border-brand-800 transition-colors shadow-2xs align-baseline cursor-pointer"
          title={`View source citation for ${label}`}
        >
          <FileText className="w-3 h-3 text-brand-500 shrink-0" />
          <span>{label}</span>
        </button>
      );

      lastIndex = citationRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(renderBasicFormatting(text.substring(lastIndex)));
    }

    return parts.length > 0 ? parts : renderBasicFormatting(text);
  };

  const renderBasicFormatting = (text: string): React.ReactNode => {
    // Split by inline code `...`
    const codeParts = text.split(/(`[^`]+`)/g);

    return codeParts.map((part, idx) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/90 text-brand-600 dark:text-brand-300 font-mono text-xs border border-slate-200/70 dark:border-slate-750"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // Format bold **...** and italics *...*
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return (
        <span key={idx}>
          {boldParts.map((bPart, bIdx) => {
            if (bPart.startsWith('**') && bPart.endsWith('**')) {
              return (
                <strong key={bIdx} className="font-semibold text-slate-900 dark:text-slate-100">
                  {bPart.slice(2, -2)}
                </strong>
              );
            }

            const italicParts = bPart.split(/(\*[^*]+\*)/g);
            return italicParts.map((iPart, iIdx) => {
              if (iPart.startsWith('*') && iPart.endsWith('*')) {
                return (
                  <em key={iIdx} className="italic text-slate-800 dark:text-slate-200">
                    {iPart.slice(1, -1)}
                  </em>
                );
              }
              return iPart;
            });
          })}
        </span>
      );
    });
  };

  // Split lines and parse blocks
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];
  let codeBlockIndex = 0;

  let inUnorderedList = false;
  let ulItems: React.ReactNode[] = [];

  let inOrderedList = false;
  let olItems: React.ReactNode[] = [];

  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];

  const flushLists = () => {
    if (inUnorderedList && ulItems.length > 0) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="my-2.5 space-y-1.5 list-disc list-outside ml-5 text-slate-700 dark:text-slate-300">
          {ulItems}
        </ul>
      );
      ulItems = [];
      inUnorderedList = false;
    }
    if (inOrderedList && olItems.length > 0) {
      blocks.push(
        <ol key={`ol-${blocks.length}`} className="my-2.5 space-y-1.5 list-decimal list-outside ml-5 text-slate-700 dark:text-slate-300">
          {olItems}
        </ol>
      );
      olItems = [];
      inOrderedList = false;
    }
  };

  const flushTable = () => {
    if (inTable && tableHeader.length > 0) {
      blocks.push(
        <div key={`table-${blocks.length}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                {tableHeader.map((th, thIdx) => (
                  <th key={thIdx} className="px-3.5 py-2 font-semibold text-slate-800 dark:text-slate-200">
                    {renderInline(th.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {tableRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors"
                >
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2 text-slate-700 dark:text-slate-300">
                      {renderInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeader = [];
      tableRows = [];
      inTable = false;
    }
  };

  const flushAll = () => {
    flushLists();
    flushTable();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check code blocks
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        flushAll();
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeBlockLines = [];
      } else {
        const fullCode = codeBlockLines.join('\n');
        const currIndex = codeBlockIndex++;
        blocks.push(
          <div
            key={`code-${currIndex}`}
            className="my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 shadow-xs"
          >
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700/60 text-xs text-slate-400 font-mono">
              <span>{codeBlockLang || 'code'}</span>
              <button
                onClick={() => copyCode(fullCode, currIndex)}
                className="flex items-center gap-1 hover:text-slate-200 transition-colors text-xs"
              >
                {copiedIndex === currIndex ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono overflow-x-auto leading-relaxed">
              <code>{fullCode}</code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Markdown tables: lines with `|`
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      flushLists();
      const cells = line
        .trim()
        .slice(1, -1)
        .split('|');

      // Check if separator line e.g. |---|---|
      const isSeparator = cells.every((c) => /^\s*[-:]+\s*$/.test(c));

      if (!inTable) {
        // First line is header
        inTable = true;
        tableHeader = cells;
        tableRows = [];
      } else if (isSeparator) {
        // Skip separator line
        continue;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Headers
    if (line.startsWith('### ')) {
      flushAll();
      blocks.push(
        <h4 key={`h3-${i}`} className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-4 mb-1.5">
          {renderInline(line.slice(4))}
        </h4>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushAll();
      blocks.push(
        <h3 key={`h2-${i}`} className="text-base font-bold text-slate-900 dark:text-slate-100 mt-5 mb-2 pb-1 border-b border-slate-100 dark:border-slate-800">
          {renderInline(line.slice(3))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      flushAll();
      blocks.push(
        <h2 key={`h1-${i}`} className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-5 mb-2.5">
          {renderInline(line.slice(2))}
        </h2>
      );
      continue;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      flushAll();
      blocks.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-4 border-brand-500 pl-3.5 py-1.5 my-2.5 bg-brand-50/40 dark:bg-brand-950/20 rounded-r-lg text-xs italic text-slate-600 dark:text-slate-300"
        >
          {renderInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Unordered List items (- or * or •)
    const bulletMatch = line.trim().match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (inOrderedList) flushLists();
      inUnorderedList = true;
      ulItems.push(
        <li key={`uli-${i}`} className="leading-relaxed">
          {renderInline(bulletMatch[1])}
        </li>
      );
      continue;
    }

    // Ordered List items (1. , 2. )
    const orderedMatch = line.trim().match(/^(\d+)[.)]\s+(.*)$/);
    if (orderedMatch) {
      if (inUnorderedList) flushLists();
      inOrderedList = true;
      olItems.push(
        <li key={`oli-${i}`} className="leading-relaxed">
          {renderInline(orderedMatch[2])}
        </li>
      );
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      flushAll();
      continue;
    }

    // Regular paragraphs
    flushAll();
    blocks.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 my-1.5">
        {renderInline(line)}
      </p>
    );
  }

  flushAll();

  return <div className="space-y-1 text-sm font-normal">{blocks}</div>;
};
