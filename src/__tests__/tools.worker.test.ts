import { describe, it, expect } from 'vitest';
import { parseCSVLine } from '../worker/utils';
import { parseGenericCSV, dedupeRows, rowsToCsv } from '../worker/tools.worker';

describe('Tools Worker Functions', () => {
  describe('parseGenericCSV', () => {
    it('should parse basic CSV with headers', () => {
      const csv = `ID,Name,Value
1,Test,100
2,Test2,200`;

      const result = parseGenericCSV(csv);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ ID: '1', Name: 'Test', Value: '100' });
      expect(result[1]).toEqual({ ID: '2', Name: 'Test2', Value: '200' });
    });

    it('should handle empty values', () => {
      const csv = `ID,Name,Value
1,,100
2,Test,`;

      const result = parseGenericCSV(csv);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ ID: '1', Name: '', Value: '100' });
      expect(result[1]).toEqual({ ID: '2', Name: 'Test', Value: '' });
    });

    it('should handle quoted fields with commas', () => {
      const csv = `ID,Name,Description
1,Test,"Value, with comma"
2,Test2,"Another, value"`;

      const result = parseGenericCSV(csv);
      expect(result).toHaveLength(2);
      expect(result[0].Description).toBe('Value, with comma');
      expect(result[1].Description).toBe('Another, value');
    });

    it('should skip malformed lines', () => {
      const csv = `ID,Name,Value\n1,Test,100\n2,"Unclosed,200\n3,Valid,300`;

      const result = parseGenericCSV(csv);
      expect(result).toHaveLength(2);
      expect(result[0].ID).toBe('1');
      expect(result[1].ID).toBe('3');
    });

    it('should return empty array for header-only CSV', () => {
      const csv = 'ID,Name,Value';
      const result = parseGenericCSV(csv);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty CSV', () => {
      expect(parseGenericCSV('')).toEqual([]);
      expect(parseGenericCSV('\n\n')).toEqual([]);
    });

    it('should handle Windows line endings', () => {
      const csv = 'ID,Name,Value\r\n1,Test,100\r\n2,Test2,200';
      const result = parseGenericCSV(csv);
      expect(result).toHaveLength(2);
    });

    it('should skip empty lines', () => {
      const csv = `ID,Name,Value
1,Test,100

2,Test2,200`;

      const result = parseGenericCSV(csv);
      expect(result).toHaveLength(2);
    });

    it('should handle escaped quotes in fields', () => {
      const csv = `ID,Name,Quote
1,Test,"He said ""hello"""
2,Test2,"Value with ""quotes"""`;

      const result = parseGenericCSV(csv);
      expect(result[0].Quote).toBe('He said "hello"');
      expect(result[1].Quote).toBe('Value with "quotes"');
    });
  });

  describe('dedupeRows', () => {
    it('should remove duplicate IDs', () => {
      const rows = [
        { ID: '1', Name: 'First' },
        { ID: '2', Name: 'Second' },
        { ID: '1', Name: 'Duplicate' },
      ];

      const result = dedupeRows(rows);
      expect(result).toHaveLength(2);
      expect(result[0].Name).toBe('First');
      expect(result[1].Name).toBe('Second');
    });

    it('should handle lowercase id field', () => {
      const rows = [
        { id: '1', Name: 'First' },
        { id: '2', Name: 'Second' },
        { id: '1', Name: 'Duplicate' },
      ];

      const result = dedupeRows(rows);
      expect(result).toHaveLength(2);
    });

    it('should handle mixed case Id field', () => {
      const rows = [
        { Id: '1', Name: 'First' },
        { Id: '2', Name: 'Second' },
        { Id: '1', Name: 'Duplicate' },
      ];

      const result = dedupeRows(rows);
      expect(result).toHaveLength(2);
    });

    it('should skip rows without ID', () => {
      const rows = [
        { ID: '1', Name: 'First' },
        { ID: '', Name: 'No ID' },
        { ID: '2', Name: 'Second' },
      ];

      const result = dedupeRows(rows);
      expect(result).toHaveLength(2);
      expect(result[0].ID).toBe('1');
      expect(result[1].ID).toBe('2');
    });

    it('should handle empty array', () => {
      expect(dedupeRows([])).toEqual([]);
    });

    it('should preserve first occurrence of duplicate', () => {
      const rows = [
        { ID: '1', Name: 'First', Value: '100' },
        { ID: '1', Name: 'Second', Value: '200' },
        { ID: '1', Name: 'Third', Value: '300' },
      ];

      const result = dedupeRows(rows);
      expect(result).toHaveLength(1);
      expect(result[0].Name).toBe('First');
      expect(result[0].Value).toBe('100');
    });

    it('should handle all unique IDs', () => {
      const rows = [
        { ID: '1', Name: 'First' },
        { ID: '2', Name: 'Second' },
        { ID: '3', Name: 'Third' },
      ];

      const result = dedupeRows(rows);
      expect(result).toHaveLength(3);
    });
  });

  describe('rowsToCsv', () => {
    it('should convert rows to CSV format', () => {
      const rows = [
        { ID: '1', Name: 'Test', Value: '100' },
        { ID: '2', Name: 'Test2', Value: '200' },
      ];

      const csv = rowsToCsv(rows);
      const lines = csv.trim().split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('ID,Name,Value');
      expect(lines[1]).toBe('1,Test,100');
      expect(lines[2]).toBe('2,Test2,200');
    });

    it('should escape fields with commas', () => {
      const rows = [{ ID: '1', Name: 'Test, with comma', Value: '100' }];

      const csv = rowsToCsv(rows);
      expect(csv).toContain('"Test, with comma"');
    });

    it('should escape fields with quotes', () => {
      const rows = [{ ID: '1', Name: 'Test "quoted"', Value: '100' }];

      const csv = rowsToCsv(rows);
      expect(csv).toContain('"Test ""quoted"""');
    });

    it('should escape fields with newlines', () => {
      const rows = [{ ID: '1', Name: 'Test\nwith newline', Value: '100' }];

      const csv = rowsToCsv(rows);
      expect(csv).toContain('"Test\nwith newline"');
    });

    it('should return empty string for empty array', () => {
      expect(rowsToCsv([])).toBe('');
    });

    it('should handle missing values', () => {
      const rows = [
        { ID: '1', Name: 'Test', Value: '' },
        { ID: '2', Name: '', Value: '200' },
      ];

      const csv = rowsToCsv(rows);
      const lines = csv.trim().split('\n');
      expect(lines[1]).toBe('1,Test,');
      expect(lines[2]).toBe('2,,200');
    });

    it('should preserve header order from first file', () => {
      const rows = [{ Name: 'Test', ID: '1', Value: '100' }];
      const firstFileHeaders = ['ID', 'Name', 'Value'];

      const csv = rowsToCsv(rows, firstFileHeaders);
      const lines = csv.trim().split('\n');
      expect(lines[0]).toBe('ID,Name,Value');
    });

    it('should add new headers not in first file', () => {
      const rows = [{ ID: '1', Name: 'Test', Extra: 'data' }];
      const firstFileHeaders = ['ID', 'Name'];

      const csv = rowsToCsv(rows, firstFileHeaders);
      const lines = csv.trim().split('\n');
      expect(lines[0]).toBe('ID,Name,Extra');
    });

    it('should handle rows with different keys', () => {
      const rows = [
        { ID: '1', Name: 'Test', Value: '' },
        { ID: '2', Name: '', Value: '200' },
        { ID: '3', Name: 'Test3', Value: '300' },
      ];

      const csv = rowsToCsv(rows);
      const lines = csv.trim().split('\n');
      expect(lines[0]).toBe('ID,Name,Value');
      expect(lines).toHaveLength(4);
    });

    it('should end with newline', () => {
      const rows = [{ ID: '1', Name: 'Test' }];
      const csv = rowsToCsv(rows);
      expect(csv.endsWith('\n')).toBe(true);
    });

    it('should not duplicate headers from firstFileHeaders', () => {
      const rows = [{ ID: '1', Name: 'Test', Value: '100' }];
      const firstFileHeaders = ['ID', 'Name', 'ID'];

      const csv = rowsToCsv(rows, firstFileHeaders);
      const headerLine = csv.split('\n')[0];
      const headers = headerLine.split(',');
      const idCount = headers.filter(h => h === 'ID').length;
      expect(idCount).toBe(1);
    });
  });

  describe('Integration: Full CSV Processing', () => {
    it('should parse, dedupe, and convert back to CSV', () => {
      const inputCsv = `ID,Name,Value
1,First,100
2,Second,200
1,Duplicate,300
3,Third,400`;

      const parsed = parseGenericCSV(inputCsv);
      expect(parsed).toHaveLength(4);

      const deduped = dedupeRows(parsed);
      expect(deduped).toHaveLength(3);

      const outputCsv = rowsToCsv(deduped);
      const lines = outputCsv.trim().split('\n');
      expect(lines).toHaveLength(4);
      expect(lines[0]).toBe('ID,Name,Value');
    });

    it('should handle multiple files with same headers', () => {
      const file1 = `ID,Name,Value
1,First,100
2,Second,200`;

      const file2 = `ID,Name,Value
3,Third,300
1,Duplicate,400`;

      const rows1 = parseGenericCSV(file1);
      const rows2 = parseGenericCSV(file2);
      const allRows = [...rows1, ...rows2];

      expect(allRows).toHaveLength(4);

      const deduped = dedupeRows(allRows);
      expect(deduped).toHaveLength(3);
      expect(deduped.map(r => r.ID)).toEqual(['1', '2', '3']);
    });

    it('should handle multiple files with different headers', () => {
      const file1 = `ID,Name
1,First
2,Second`;

      const file2 = `ID,Value
3,300
1,400`;

      const rows1 = parseGenericCSV(file1);
      const rows2 = parseGenericCSV(file2);
      const allRows = [...rows1, ...rows2];
      const deduped = dedupeRows(allRows);

      const csv = rowsToCsv(deduped);
      const lines = csv.trim().split('\n');
      expect(lines[0]).toBe('ID,Name,Value');
    });

    it('should preserve first file header order', () => {
      const file1 = `Name,ID,Value
First,1,100`;

      const file2 = `ID,Name,Extra
2,Second,data`;

      const firstFileHeaders = parseCSVLine('Name,ID,Value');
      const rows1 = parseGenericCSV(file1);
      const rows2 = parseGenericCSV(file2);
      const allRows = [...rows1, ...rows2];

      const csv = rowsToCsv(allRows, firstFileHeaders);
      const lines = csv.trim().split('\n');
      expect(lines[0]).toBe('Name,ID,Value,Extra');
    });
  });
});
