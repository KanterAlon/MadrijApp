export async function parseSpreadsheetFile(file: File): Promise<string[][]> {
  if (file.name.toLowerCase().endsWith('.csv')) {
    const Papa = await import('papaparse');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const { data } = Papa.parse<string[]>(text.trim(), {
          skipEmptyLines: true,
        });
        resolve(data as string[][]);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  const xlsx = await import('xlsx');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const data = new Uint8Array(reader.result as ArrayBuffer);
      try {
        const wb = xlsx.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
