import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { expenses } = body;

    if (!expenses || !Array.isArray(expenses)) {
      return NextResponse.json({ success: false, error: 'No expenses provided' }, { status: 400 });
    }

    // 2. Faqat "Ish haqi" kategoriyasidagi xarajatlarni ajratish
    const salaryExpenses = expenses.filter((e: any) =>
      e.category === 'Ish haqi' && (e.title?.includes("Avans to'lovi") || e.title?.includes("Oylik to'lovi"))
    );

    // 3. Google Sheets ulanish
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), 'credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1k8vMhWoQ9jy4CLl55ipGf7vq2VykAZ3bM_VV5yl8bgc';
    const sheetName = 'Ish haqi va Avanslar';

    // 4. Varaq mavjudligini tekshirish
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

    if (!existingSheets.includes(sheetName)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sheetName } } }],
        },
      });
    }

    // 5. Eski ma'lumotlarni tozalash
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${sheetName}'!A:F`,
    });

    // 6. Sarlavhalar + ma'lumotlar
    const header = ['Sana', 'Xodim Ismi', 'Lavozimi', "To'lov Turi", 'Summa (so\'m)', 'Izoh'];

    const rows = salaryExpenses.map((e: any) => {
      // Title'dan ism va turini ajratish: "Avans to'lovi - Ism Familiya"
      const isAvans = e.title?.includes("Avans to'lovi");
      const type = isAvans ? 'Avans' : 'Oylik';
      const namePart = e.title?.split(' - ')?.[1] || e.title || '';
      return [
        e.date?.split('T')?.[0] || '',
        namePart.trim(),
        '', // Lavozim (bazada yo'q bo'lishi mumkin)
        type,
        Number(e.amount || 0),
        e.comment || '',
      ];
    });

    // Yozish
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [header, ...rows],
      },
    });

    // 7. Formatlash
    const newSheet = (await sheets.spreadsheets.get({ spreadsheetId })).data.sheets?.find(
      s => s.properties?.title === sheetName
    );
    const sheetId = newSheet?.properties?.sheetId;

    if (sheetId !== undefined) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 6 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.15, green: 0.5, blue: 0.2 },
                    textFormat: { bold: true, fontSize: 11, foregroundColor: { red: 1, green: 1, blue: 1 } },
                    horizontalAlignment: 'CENTER',
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
              },
            },
            {
              updateSheetProperties: {
                properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
                fields: 'gridProperties.frozenRowCount',
              },
            },
            {
              updateDimensionProperties: {
                range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 6 },
                properties: { pixelSize: 180 },
                fields: 'pixelSize',
              },
            },
            {
              setBasicFilter: {
                filter: { range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: 6 } },
              },
            },
          ],
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `${rows.length} ta to'lov Google Sheets'ga sinxronlashtirildi`,
      totalRecords: rows.length,
    });
  } catch (error: any) {
    console.error('Sync xatolik:', error?.message || error);
    return NextResponse.json({ success: false, error: error?.message || "Noma'lum xatolik" }, { status: 500 });
  }
}
