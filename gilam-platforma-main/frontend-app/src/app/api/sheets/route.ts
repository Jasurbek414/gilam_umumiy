import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employeeName, role, type, amount, date } = body;

    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), 'credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1k8vMhWoQ9jy4CLl55ipGf7vq2VykAZ3bM_VV5yl8bgc'; // Baza jadval
    const sheetName = 'Ish haqi va Avanslar';

    // Varaq mavjudligini tekshirish va yo'q bo'lsa yaratish
    try {
      await sheets.spreadsheets.values.get({ spreadsheetId, range: "'Ish haqi va Avanslar'!A1" });
    } catch (e: any) {
      if (e.message && e.message.includes('Unable to parse range')) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: { properties: { title: sheetName } }
            }]
          }
        });
        // Sarlavhalar yozish
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: "'Ish haqi va Avanslar'!A1",
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['Sana', 'Xodim Ismi', 'Lavozimi', 'Tolov Turi', 'Summa']]
          }
        });
      }
    }

    // Ma'lumotlarni yozish
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "'Ish haqi va Avanslar'!A1",
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[date, employeeName, role, type, amount]]
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Google Sheets Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
