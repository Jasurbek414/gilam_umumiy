import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employeeName, role, type, amount, date } = body;

    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), 'credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1k8vMhWoQ9jy4CLl55ipGf7vq2VykAZ3bM_VV5yl8bgc';
    const sheetName = 'Ish haqi va Avanslar';

    // Varaq mavjudligini tekshirish
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

    if (!existingSheets.includes(sheetName)) {
      // Yangi varaq yaratish
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sheetName } } }],
        },
      });

      // Sarlavhalar yozish
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${sheetName}'!A1:E1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['Sana', 'Xodim Ismi', 'Lavozimi', "To'lov Turi", 'Summa (so\'m)']],
        },
      });

      // Sarlavhani formatlash
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
                  range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 5 },
                  cell: {
                    userEnteredFormat: {
                      backgroundColor: { red: 0.15, green: 0.15, blue: 0.15 },
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
                  range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 5 },
                  properties: { pixelSize: 180 },
                  fields: 'pixelSize',
                },
              },
              {
                setBasicFilter: {
                  filter: { range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: 5 } },
                },
              },
            ],
          },
        });
      }
    }

    // Ma'lumotni qo'shish
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${sheetName}'!A:E`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[date, employeeName, role, type, Number(amount)]],
      },
    });

    return NextResponse.json({ success: true, message: 'Google Sheets ga yozildi' });
  } catch (error: any) {
    console.error('Google Sheets xatolik:', error?.message || error);
    return NextResponse.json({ success: false, error: error?.message || 'Noma\'lum xatolik' }, { status: 500 });
  }
}
