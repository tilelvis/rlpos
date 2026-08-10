// CSV menu import service (port of lib/core/services/menu_csv_import_service.dart).
//
// Expected header row (case-insensitive, any column order):
//   name, price, category, description (optional), available (optional)
// `available` accepts yes/no, true/false, or 1/0 — anything else (or a
// blank cell) defaults to available.

import { Category } from '../models/category.js';
import { MenuItem } from '../models/menu_item.js';
import { CsvParser } from './csv.js';

export const MenuCsvImportService = {
  parse(csvText, existingCategories) {
    const rows = CsvParser.parse(csvText);
    if (rows.length === 0) {
      return { items: [], newCategories: [], errors: ['The CSV file is empty.'] };
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const nameIdx = header.indexOf('name');
    const priceIdx = header.indexOf('price');
    const catIdx = header.indexOf('category');
    const descIdx = header.indexOf('description');
    const availIdx = header.indexOf('available');

    if (nameIdx === -1 || priceIdx === -1 || catIdx === -1) {
      return {
        items: [],
        newCategories: [],
        errors: [
          `CSV must have "name", "price", and "category" columns (found: ${header.join(', ')}).`,
        ],
      };
    }

    const catByName = new Map();
    for (const c of existingCategories) {
      catByName.set(c.name.trim().toLowerCase(), c);
    }
    const newCategories = [];
    const items = [];
    const errors = [];
    const stamp = Date.now();
    let sort = 100;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const name = nameIdx < row.length ? row[nameIdx].trim() : '';
      if (name.length === 0) continue; // skip fully blank rows

      const priceStr = priceIdx < row.length ? row[priceIdx].trim() : '';
      const price = parseFloat(priceStr.replace(/,/g, ''));
      if (Number.isNaN(price)) {
        errors.push(`Row ${r + 1}: invalid price "${priceStr}" for "${name}" — skipped.`);
        continue;
      }

      const catName = catIdx < row.length ? row[catIdx].trim() : '';
      if (catName.length === 0) {
        errors.push(`Row ${r + 1}: missing category for "${name}" — skipped.`);
        continue;
      }
      let category = catByName.get(catName.toLowerCase());
      if (!category) {
        category = new Category({
          id: `c-${stamp}-${catByName.size}`,
          name: catName,
          sortOrder: catByName.size + 1,
        });
        catByName.set(catName.toLowerCase(), category);
        newCategories.push(category);
      }

      const description =
        descIdx !== -1 && descIdx < row.length && row[descIdx].trim().length > 0
          ? row[descIdx].trim()
          : null;

      const availableStr =
        availIdx !== -1 && availIdx < row.length
          ? row[availIdx].trim().toLowerCase()
          : '';
      const available =
        availableStr === '' ||
        availableStr === 'yes' ||
        availableStr === 'true' ||
        availableStr === '1';

      items.push(
        new MenuItem({
          id: `m-${stamp}-${r}`,
          name,
          price,
          categoryId: category.id,
          available,
          description,
          sortOrder: sort++,
        }),
      );
    }

    return { items, newCategories, errors };
  },
};
