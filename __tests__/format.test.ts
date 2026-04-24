import { centsFromDollars, csvEscape, dollars } from '../src/lib/format';

describe('format', () => {
  it('renders dollars', () => {
    expect(dollars(4523)).toBe('$45.23');
    expect(dollars(0)).toBe('$0.00');
    expect(dollars(null)).toBe('$0.00');
  });

  it('parses cents from dollar-input strings', () => {
    expect(centsFromDollars('45.23')).toBe(4523);
    expect(centsFromDollars('$1,234.56')).toBe(123456);
    expect(centsFromDollars('abc')).toBe(0);
  });

  it('escapes csv values that contain commas or quotes', () => {
    expect(csvEscape('hello')).toBe('hello');
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('she said "hi"')).toBe('"she said ""hi"""');
    expect(csvEscape(null)).toBe('');
  });
});
