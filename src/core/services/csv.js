// CSV file picker + a small, dependency-free CSV parser.
// Port of lib/core/services/csv_service.dart.

export const CsvFilePicker = {
  maxBytes: 2 * 1024 * 1024, // 2 MB

  /** Let the user pick a .csv file. Returns the text content, or null if
   *  they cancel. Calls onError(msg) on validation failures. */
  pickCsvText({ onError } = {}) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,text/csv';
      input.style.position = 'fixed';
      input.style.opacity = '0';
      input.style.pointerEvents = 'none';

      let settled = false;
      const finish = (val) => {
        if (settled) return;
        settled = true;
        try {
          input.remove();
        } catch {}
        resolve(val);
      };

      input.addEventListener('change', () => {
        const files = input.files;
        if (!files || files.length === 0) {
          finish(null);
          return;
        }
        const file = files[0];
        if (file.size > this.maxBytes) {
          onError?.('CSV file is too large (max 2 MB).');
          finish(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => finish(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => {
          onError?.('Could not read the selected file.');
          finish(null);
        };
        reader.readAsText(file);
      });

      // If the user closes the file picker without selecting, `change`
      // never fires. We can't reliably detect "cancelled" — but the
      // promise will just stay unresolved, which is fine.
      document.body.appendChild(input);
      input.click();
    });
  },
};

export const CsvParser = {
  /** Parse a CSV string into a list of rows. Handles quoted fields,
   *  embedded commas/newlines, and escaped "" quotes. Both \n and \r\n
   *  line endings are accepted. */
  parse(input) {
    const rows = [];
    let row = [];
    let buf = '';
    let inQuotes = false;
    const s = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < s.length && s[i + 1] === '"') {
            buf += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          buf += ch;
        }
        continue;
      }
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(buf);
        buf = '';
      } else if (ch === '\n') {
        row.push(buf);
        buf = '';
        rows.push(row);
        row = [];
      } else {
        buf += ch;
      }
    }
    if (buf.length > 0 || row.length > 0) {
      row.push(buf);
      rows.push(row);
    }
    return rows.filter((r) => r.some((c) => c.trim().length > 0));
  },
};
