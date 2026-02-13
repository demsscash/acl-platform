// Export utilities for CSV and Print

export function exportToCSV(data: Record<string, any>[], filename: string, columns: { key: string; label: string }[]) {
  // Create header row
  const header = columns.map(col => `"${col.label}"`).join(',');

  // Create data rows
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return '""';
      if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
      if (typeof value === 'number') return value.toString();
      if (value instanceof Date) return `"${value.toLocaleDateString('fr-FR')}"`;
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',')
  );

  // Combine header and rows
  const csvContent = [header, ...rows].join('\n');

  // Create blob with BOM for Excel UTF-8 support
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Download file
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printTable(title: string, headers: string[], rows: string[][]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Veuillez autoriser les popups pour imprimer');
    return;
  }

  const tableRows = rows.map(row =>
    `<tr>${row.map(cell => `<td style="border: 1px solid #ddd; padding: 8px;">${cell}</td>`).join('')}</tr>`
  ).join('');

  const tableHeaders = headers.map(h =>
    `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f5b800; color: #333;">${h}</th>`
  ).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; margin-bottom: 5px; }
        .date { color: #666; margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { text-align: left; }
        @media print {
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="date">Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
      <button onclick="window.print();" style="padding: 10px 20px; background: #f5b800; border: none; cursor: pointer; margin-bottom: 20px;">Imprimer</button>
      <table>
        <thead><tr>${tableHeaders}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </body>
    </html>
  `);

  printWindow.document.close();
}
