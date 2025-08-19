import {marked} from 'marked';

interface TableCell {
  content: string;
}

interface TableRow {
  cells: TableCell[];
}

interface AsciiTableOptions {
  columnPadding?: number;
  maxColumnWidth?: number;
}

/**
 * Calculates the maximum width for each column in the table
 */
function calculateColumnWidths(rows: TableRow[]): number[] {
  if (rows.length === 0) return [];

  const columnCount = rows[0].cells.length;
  const widths: number[] = new Array(columnCount).fill(0);

  rows.forEach(row => {
    row.cells.forEach((cell, index) => {
      widths[index] = Math.max(widths[index], cell.content.length);
    });
  });

  return widths;
}

/**
 * Pads a string to the specified width
 */
function padString(
  str: string,
  width: number,
  align: 'left' | 'center' | 'right' = 'left'
): string {
  const paddingNeeded = width - str.length;
  if (paddingNeeded <= 0) return str;

  switch (align) {
    case 'center': {
      const leftPad = Math.floor(paddingNeeded / 2);
      const rightPad = paddingNeeded - leftPad;
      return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
    }
    case 'right':
      return ' '.repeat(paddingNeeded) + str;
    default:
      // left
      return str + ' '.repeat(paddingNeeded);
  }
}

/**
 * Creates a horizontal border for the ASCII table
 */
function createBorder(
  columnWidths: number[],
  char = '-',
  junction = '+'
): string {
  const segments = columnWidths.map(width => char.repeat(width + 2));
  return junction + segments.join(junction) + junction;
}

/**
 * Formats a table row with proper spacing and borders
 */
function formatRow(row: TableRow, columnWidths: number[]): string {
  const formattedCells = row.cells.map((cell, index) => {
    return ' ' + padString(cell.content, columnWidths[index]) + ' ';
  });
  return '|' + formattedCells.join('|') + '|';
}

/**
 * Converts marked table tokens to ASCII formatted table
 */
export function formatAsciiTable(
  header: marked.Tokens.TableCell[],
  rows: marked.Tokens.TableCell[][],
  parseCell: (cell: marked.Tokens.TableCell) => string,
  options: AsciiTableOptions = {}
): string {
  const {maxColumnWidth = 50} = options;

  // Convert marked tokens to our table structure
  const tableRows: TableRow[] = [];

  // Add header
  tableRows.push({
    cells: header.map(cell => ({
      content: parseCell(cell).substring(0, maxColumnWidth),
    })),
  });

  // Add data rows
  rows.forEach(row => {
    tableRows.push({
      cells: row.map(cell => ({
        content: parseCell(cell).substring(0, maxColumnWidth),
      })),
    });
  });

  // Calculate column widths
  const columnWidths = calculateColumnWidths(tableRows);

  // Build the ASCII table
  const lines: string[] = [];

  // Top border
  lines.push(createBorder(columnWidths));

  // Header row
  lines.push(formatRow(tableRows[0], columnWidths));

  // Header separator
  lines.push(createBorder(columnWidths, '=', '+'));

  // Data rows
  for (let i = 1; i < tableRows.length; i++) {
    lines.push(formatRow(tableRows[i], columnWidths));
    // Add separator between rows (optional - can be removed for cleaner look)
    if (i < tableRows.length - 1) {
      lines.push(createBorder(columnWidths));
    }
  }

  // Bottom border
  lines.push(createBorder(columnWidths));

  return lines.join('\n');
}

/**
 * Creates a simple ASCII table without heavy borders
 */
export function formatSimpleAsciiTable(
  header: marked.Tokens.TableCell[],
  rows: marked.Tokens.TableCell[][],
  parseCell: (cell: marked.Tokens.TableCell) => string,
  options: AsciiTableOptions = {}
): string {
  const {maxColumnWidth = 50} = options;

  // Convert marked tokens to our table structure
  const tableRows: TableRow[] = [];

  // Add header
  tableRows.push({
    cells: header.map(cell => ({
      content: parseCell(cell).substring(0, maxColumnWidth),
    })),
  });

  // Add data rows
  rows.forEach(row => {
    tableRows.push({
      cells: row.map(cell => ({
        content: parseCell(cell).substring(0, maxColumnWidth),
      })),
    });
  });

  // Calculate column widths
  const columnWidths = calculateColumnWidths(tableRows);

  // Build the ASCII table
  const lines: string[] = [];

  // Header row
  const headerCells = tableRows[0].cells.map((cell, index) =>
    padString(cell.content, columnWidths[index])
  );
  lines.push(headerCells.join('  ').trimEnd());

  // Header separator
  const separators = columnWidths.map(width => '-'.repeat(width));
  lines.push(separators.join('  ').trimEnd());

  // Data rows
  for (let i = 1; i < tableRows.length; i++) {
    const dataCells = tableRows[i].cells.map((cell, index) =>
      padString(cell.content, columnWidths[index])
    );
    lines.push(dataCells.join('  ').trimEnd());
  }

  return lines.join('\n');
}
