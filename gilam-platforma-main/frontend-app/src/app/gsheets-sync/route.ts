import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  COMPANY_ADMIN: 'Kompaniya Admin',
  MANAGER: 'Menejer',
  OPERATOR: 'Operator',
  DRIVER: 'Haydovchi',
  WORKER: 'Ishchi',
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staff, expenses } = body;

    if (!staff || !Array.isArray(staff)) {
      return NextResponse.json({ success: false, error: "Xodimlar ro'yxati topilmadi" }, { status: 400 });
    }

    // 1. Ish haqi xarajatlarini ajratish
    const salaryExpenses = (expenses || []).filter((e: any) =>
      e.category === 'Ish haqi' && (
        e.title?.includes("Avans") ||
        e.title?.includes("Oylik")
      )
    );

    // 2. Har bir xodim uchun to'lovlarni guruhlash
    const staffPayments: Record<string, any[]> = {};
    for (const member of staff) {
      const name = member.fullName || member.full_name || '';
      staffPayments[name] = [];
    }

    for (const exp of salaryExpenses) {
      const namePart = exp.title?.split(' - ')?.[1]?.trim() || '';
      const isAvans = exp.title?.toLowerCase()?.includes('avans');
      const dateStr = exp.date?.split('T')?.[0] || '';
      const payment = {
        date: dateStr,
        type: isAvans ? 'Avans' : 'Oylik',
        amount: Number(exp.amount || 0),
        comment: exp.comment || '',
      };
      if (staffPayments[namePart]) {
        staffPayments[namePart].push(payment);
      }
    }

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

    // 4.5. Eski filter, merge, conditional format'larni tozalash
    const preSheet = (await sheets.spreadsheets.get({ spreadsheetId })).data.sheets?.find(
      s => s.properties?.title === sheetName
    );
    const preSheetId = preSheet?.properties?.sheetId;
    if (preSheetId !== undefined) {
      const cleanupRequests: any[] = [];
      cleanupRequests.push({
        unmergeCells: {
          range: { sheetId: preSheetId, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 20 },
        },
      });
      if (preSheet?.basicFilter) {
        cleanupRequests.push({ clearBasicFilter: { sheetId: preSheetId } });
      }
      const ruleCount = preSheet?.conditionalFormats?.length || 0;
      for (let i = ruleCount - 1; i >= 0; i--) {
        cleanupRequests.push({ deleteConditionalFormatRule: { sheetId: preSheetId, index: i } });
      }
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: cleanupRequests },
      });
    }

    // 5. Eski ma'lumotlarni tozalash
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${sheetName}'!A:K`,
    });

    // ====== YAGONA JADVAL ======
    const now = new Date();
    const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear();
    const syncTime = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${currentYear} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const COLS = 10;
    const allRows: any[][] = [];
    const rowTypes: string[] = []; // 'title' | 'subtitle' | 'header' | 'employee' | 'payment' | 'total' | 'empty'

    // TITLE
    allRows.push([`XODIMLAR ISH HAQI VA AVANSLAR HISOBOTI`, '', '', '', '', '', '', '', '', '']);
    rowTypes.push('title');

    // SUBTITLE
    allRows.push([`Yangilangan: ${syncTime}  |  ${currentMonth} ${currentYear}`, '', '', '', '', '', '', '', '', '']);
    rowTypes.push('subtitle');

    // BO'SH
    allRows.push(Array(COLS).fill(''));
    rowTypes.push('empty');

    // HEADER
    allRows.push(['№', 'Sana', 'Xodim Ismi', 'Lavozimi', 'Telefon', 'Ish rejimi', "To'lov Turi", "Summa (so'm)", 'Izoh', "Qoldiq (so'm)"]);
    rowTypes.push('header');
    const headerRowIdx = allRows.length - 1;

    let totalAvans = 0;
    let totalOylik = 0;
    let totalSalary = 0;
    let employeeNum = 0;
    let totalPayments = 0;

    // HAR BIR XODIM
    for (const member of staff) {
      const name = member.fullName || member.full_name || '';
      const role = roleLabels[member.role] || member.role || '';
      const phone = member.phone || '';
      const schedule = member.workSchedule || member.work_schedule || '6/1';
      const salary = Number(member.salary || 0);
      const payments = staffPayments[name] || [];

      // To'lovlarni sanasi bo'yicha tartiblash
      payments.sort((a: any, b: any) => b.date.localeCompare(a.date));

      const memberAvans = payments.filter((p: any) => p.type === 'Avans').reduce((s: number, p: any) => s + p.amount, 0);
      const memberOylik = payments.filter((p: any) => p.type === 'Oylik').reduce((s: number, p: any) => s + p.amount, 0);
      const remaining = salary - memberAvans - memberOylik;

      totalAvans += memberAvans;
      totalOylik += memberOylik;
      totalSalary += salary;
      employeeNum++;

      if (payments.length === 0) {
        // Xodim — to'lovsiz
        allRows.push([employeeNum, '', name, role, phone, schedule, "—", salary, "Hali to'lov yo'q", remaining]);
        rowTypes.push('employee');
      } else {
        // Birinchi to'lov = xodim satri bilan birga
        allRows.push([employeeNum, payments[0].date, name, role, phone, schedule, payments[0].type, payments[0].amount, payments[0].comment, remaining]);
        rowTypes.push('employee');
        totalPayments++;

        // Qolgan to'lovlar
        for (let i = 1; i < payments.length; i++) {
          allRows.push(['', payments[i].date, '', '', '', '', payments[i].type, payments[i].amount, payments[i].comment, '']);
          rowTypes.push('payment');
          totalPayments++;
        }
      }
    }

    // JAMI
    const totalRemaining = totalSalary - totalAvans - totalOylik;
    allRows.push(['', '', 'JAMI:', '', '', '', `Avans: ${totalAvans.toLocaleString()}`, totalAvans + totalOylik, `Oylik: ${totalOylik.toLocaleString()}`, totalRemaining]);
    rowTypes.push('total');

    // 6. Yozish
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: allRows },
    });

    // 7. Professional formatlash
    const sheet = (await sheets.spreadsheets.get({ spreadsheetId })).data.sheets?.find(
      s => s.properties?.title === sheetName
    );
    const sheetId = sheet?.properties?.sheetId;

    if (sheetId !== undefined) {
      const requests: any[] = [];
      const totalRows = allRows.length;

      // TITLE (merge + format)
      requests.push({
        mergeCells: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: COLS },
          mergeType: 'MERGE_ALL',
        },
      });
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: COLS },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.1, green: 0.27, blue: 0.53 },
              textFormat: { bold: true, fontSize: 14, foregroundColor: { red: 1, green: 1, blue: 1 } },
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
        },
      });
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
          properties: { pixelSize: 45 },
          fields: 'pixelSize',
        },
      });

      // SUBTITLE (merge + format)
      requests.push({
        mergeCells: {
          range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: COLS },
          mergeType: 'MERGE_ALL',
        },
      });
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: COLS },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.9, green: 0.92, blue: 0.96 },
              textFormat: { italic: true, fontSize: 9, foregroundColor: { red: 0.3, green: 0.3, blue: 0.4 } },
              horizontalAlignment: 'CENTER',
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
        },
      });

      // HEADER ROW
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: headerRowIdx, endRowIndex: headerRowIdx + 1, startColumnIndex: 0, endColumnIndex: COLS },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.15, green: 0.5, blue: 0.22 },
              textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 1, green: 1, blue: 1 } },
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
        },
      });
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'ROWS', startIndex: headerRowIdx, endIndex: headerRowIdx + 1 },
          properties: { pixelSize: 35 },
          fields: 'pixelSize',
        },
      });

      // DATA ROWS — har bir satrga rang berish
      for (let i = headerRowIdx + 1; i < totalRows; i++) {
        const type = rowTypes[i];
        if (type === 'employee') {
          // Xodim satri — ko'k fon
          requests.push({
            repeatCell: {
              range: { sheetId, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 0, endColumnIndex: COLS },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.92, green: 0.95, blue: 1 },
                  textFormat: { bold: true, fontSize: 10 },
                  borders: {
                    top: { style: 'SOLID', color: { red: 0.7, green: 0.78, blue: 0.9 } },
                    bottom: { style: 'SOLID', color: { red: 0.85, green: 0.88, blue: 0.92 } },
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,borders)',
            },
          });
        } else if (type === 'payment') {
          // To'lov satri — oq/och kulrang
          requests.push({
            repeatCell: {
              range: { sheetId, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 0, endColumnIndex: COLS },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.98, green: 0.98, blue: 0.98 },
                  textFormat: { fontSize: 9, foregroundColor: { red: 0.35, green: 0.35, blue: 0.4 } },
                  borders: {
                    bottom: { style: 'DOTTED', color: { red: 0.88, green: 0.88, blue: 0.88 } },
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,borders)',
            },
          });
        } else if (type === 'total') {
          // JAMI satri
          requests.push({
            repeatCell: {
              range: { sheetId, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 0, endColumnIndex: COLS },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.95, green: 0.88, blue: 0.7 },
                  textFormat: { bold: true, fontSize: 11, foregroundColor: { red: 0.2, green: 0.15, blue: 0.05 } },
                  horizontalAlignment: 'CENTER',
                  borders: {
                    top: { style: 'SOLID_MEDIUM', color: { red: 0.7, green: 0.6, blue: 0.3 } },
                    bottom: { style: 'SOLID_MEDIUM', color: { red: 0.7, green: 0.6, blue: 0.3 } },
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,borders)',
            },
          });
        }
      }

      // NUMBER FORMAT — Summa va Qoldiq ustunlari
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: headerRowIdx + 1, endRowIndex: totalRows, startColumnIndex: 7, endColumnIndex: 8 },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'NUMBER', pattern: '#,##0' },
              horizontalAlignment: 'RIGHT',
            },
          },
          fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
        },
      });
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: headerRowIdx + 1, endRowIndex: totalRows, startColumnIndex: 9, endColumnIndex: 10 },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'NUMBER', pattern: '#,##0' },
              horizontalAlignment: 'RIGHT',
            },
          },
          fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
        },
      });

      // COLUMN WIDTHS
      const columnWidths = [35, 100, 170, 120, 120, 70, 100, 130, 180, 130];
      columnWidths.forEach((w, idx) => {
        requests.push({
          updateDimensionProperties: {
            range: { sheetId, dimension: 'COLUMNS', startIndex: idx, endIndex: idx + 1 },
            properties: { pixelSize: w },
            fields: 'pixelSize',
          },
        });
      });

      // FREEZE
      requests.push({
        updateSheetProperties: {
          properties: { sheetId, gridProperties: { frozenRowCount: headerRowIdx + 1 } },
          fields: 'gridProperties.frozenRowCount',
        },
      });

      // CONDITIONAL: Qoldiq < 0 = qizil
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{ sheetId, startRowIndex: headerRowIdx + 1, endRowIndex: totalRows, startColumnIndex: 9, endColumnIndex: 10 }],
            booleanRule: {
              condition: { type: 'NUMBER_LESS', values: [{ userEnteredValue: '0' }] },
              format: {
                backgroundColor: { red: 1, green: 0.85, blue: 0.85 },
                textFormat: { foregroundColor: { red: 0.8, green: 0.1, blue: 0.1 }, bold: true },
              },
            },
          },
          index: 0,
        },
      });

      // CONDITIONAL: Qoldiq > 0 = yashil
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{ sheetId, startRowIndex: headerRowIdx + 1, endRowIndex: totalRows, startColumnIndex: 9, endColumnIndex: 10 }],
            booleanRule: {
              condition: { type: 'NUMBER_GREATER', values: [{ userEnteredValue: '0' }] },
              format: {
                backgroundColor: { red: 0.85, green: 1, blue: 0.85 },
                textFormat: { foregroundColor: { red: 0.1, green: 0.5, blue: 0.15 }, bold: true },
              },
            },
          },
          index: 1,
        },
      });

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });
    }

    return NextResponse.json({
      success: true,
      message: `${employeeNum} ta xodim va ${totalPayments} ta to'lov sinxronlashtirildi`,
      totalStaff: employeeNum,
      totalPayments,
    });
  } catch (error: any) {
    console.error('Sync xatolik:', error?.message || error);
    return NextResponse.json({ success: false, error: error?.message || "Noma'lum xatolik" }, { status: 500 });
  }
}
