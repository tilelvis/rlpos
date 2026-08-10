// ESC/POS command builder for thermal printers (port of
// lib/core/services/esc_pos_builder.dart).
//
// Builds the raw byte stream that 58mm and 80mm ESC/POS thermal printers
// (Epson TM, Xprinter, Goojprt, etc.) understand over WebUSB. Each
// method appends bytes to an internal buffer; .build() returns the
// final Uint8Array. Methods are chainable (return `this`).
//
// Reference: https://escpos.readthedocs.io/

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// Encode a JS string as Latin-1 bytes (matches Dart's latin1.encode).
// Most thermal printers default to code page 437 / Latin-1.
function latin1Encode(s) {
  const bytes = [];
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    bytes.push(code & 0xff);
  }
  return bytes;
}

export class EscPosBuilder {
  constructor() {
    this._buffer = [];
  }

  // ---- Lifecycle ----

  /** Initialize printer (ESC @). */
  init() {
    this._buffer.push(ESC, 0x40);
    return this;
  }

  /** Feed n lines. */
  feed(n) {
    this._buffer.push(ESC, 0x64, n & 0xff);
    return this;
  }

  /** Feed `feedLines` lines then cut the paper (full cut). */
  cut({ feedLines = 3 } = {}) {
    this.feed(feedLines);
    this._buffer.push(GS, 0x56, 0x00);
    return this;
  }

  /** Beep (only on printers with a buzzer). */
  beep() {
    this._buffer.push(ESC, 0x42, 0x02, 0x04);
    return this;
  }

  // ---- Text formatting ----

  /** Set alignment: 0=left, 1=center, 2=right. */
  align(a) {
    this._buffer.push(ESC, 0x61, a & 0xff);
    return this;
  }

  left() {
    return this.align(0);
  }
  center() {
    return this.align(1);
  }
  right() {
    return this.align(2);
  }

  /** Toggle bold (ESC E n). */
  bold(on) {
    this._buffer.push(ESC, 0x45, on ? 0x01 : 0x00);
    return this;
  }

  /** Toggle double-width (GS ! 0x10 / 0x00). */
  doubleWidth(on) {
    this._buffer.push(GS, 0x21, on ? 0x10 : 0x00);
    return this;
  }

  /** Toggle double-height (GS ! 0x01 / 0x00). */
  doubleHeight(on) {
    this._buffer.push(GS, 0x21, on ? 0x01 : 0x00);
    return this;
  }

  /** Set line spacing to n dots (ESC 3 n). Default 30. */
  lineSpacing(n) {
    this._buffer.push(ESC, 0x33, n & 0xff);
    return this;
  }

  // ---- Text content ----

  /** Append raw text encoded as Latin-1. \r\n and \r become \n. */
  text(s) {
    const normalized = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (const line of normalized.split('\n')) {
      this._buffer.push(...latin1Encode(line));
      this._buffer.push(LF);
    }
    return this;
  }

  /** Append a single line of text + newline. */
  line(s) {
    this._buffer.push(...latin1Encode(s));
    this._buffer.push(LF);
    return this;
  }

  /** A divider line made of `ch` repeated `cols` times. */
  divider({ cols = 32, ch = '-' } = {}) {
    return this.line(ch.repeat(cols));
  }

  /** Empty line. */
  blank() {
    this._buffer.push(LF);
    return this;
  }

  // ---- Finalize ----

  build() {
    return new Uint8Array(this._buffer);
  }

  /** Convenience: produce a complete receipt byte stream from already-
   *  formatted plain-text content (the output of ReceiptService.generate).
   *
   *  Strategy: split the text into lines. Divider lines emitted as-is.
   *  Header lines (business name, address, phone) emitted centered.
   *  Everything else left-aligned. The TOTAL line is bolded. */
  static fromPlainText(text, { cols } = {}) {
    const b = new EscPosBuilder().init().lineSpacing(30);
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    let inHeader = true;

    for (const raw of lines) {
      const line = raw.replace(/\s+$/g, '');
      const isDivider = line.length > 0 && [...line].every((c) => c === '-');

      if (isDivider) {
        b.left().line('-'.repeat(cols));
        inHeader = false;
        continue;
      }

      if (inHeader && line.length > 0) {
        b.center().line(line);
        continue;
      }

      const isTotal = line.startsWith('TOTAL');
      if (isTotal) b.bold(true);
      b.left().line(line);
      if (isTotal) b.bold(false);
    }

    b.feed(2).cut();
    return b.build();
  }
}
