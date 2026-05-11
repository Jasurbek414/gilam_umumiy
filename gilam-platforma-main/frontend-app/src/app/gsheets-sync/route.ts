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
      return NextResponse.json({ success: false, error: 'Xodimlar ro\'yxati topilmadi' }, { status: 400 });
    }

    // 1. Ish haqi xarajatlarini ajratish
    const salaryExpenses = (expenses || []).filter((e: any) =>
      e.category === 'Ish haqi' && (
        e.title?.includes("Avans to'lovi") ||
        e.title?.includes("Oylik to'lovi") ||
        e.title?.includes("Avans") ||
        e.title?.includes("Oylik")
      )
    );

    // 2. Har bir xodim uchun to'lovlarni guruhlash
    const staffPayments: Record<string, { avans: number; oylik: number; payments: any[] }> = {};
    for (const member of staff) {
      staffPayments[member.fullName || member.full_name || ''] = {
        avans: 0,
        oylik: 0,
        payments: [],
      };
    }

    for (const exp of salaryExpenses) {
      const namePart = exp.title?.split(' - ')?.[1]?.trim() || '';
      const isAvans = exp.title?.toLowerCase()?.includes('avans');
      const amount = Number(exp.amount || 0);
      const dateStr = exp.date?.split('T')?.[0] || '';

      if (staffPayments[namePart]) {
        if (isAvans) {
          staffPayments[namePart].avans += amount;
        } else {
          staffPayments[namePart].oylik += amount;
        }
        staffPayments[namePart].payments.push({
          date: dateStr,
          type: isAvans ? 'Avans' : 'Oylik',
          amount,
          comment: exp.comment || '',
        });
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

    // 4.5. Eski filter va merge'larni tozalash
    const preSheet = (await sheets.spreadsheets.get({ spreadsheetId })).data.sheets?.find(
      s => s.properties?.title === sheetName
    );
    const preSheetId = preSheet?.properties?.sheetId;
    if (preSheetId !== undefined) {
      const cleanupRequests: any[] = [];
      // Barcha merge'larni ochish
      cleanupRequests.push({
        unmergeCells: {
          range: { sheetId: preSheetId, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 20 },
        },
      });
      // Agar filter mavjud bo'lsa olib tashlash
      if (preSheet?.basicFilter) {
        cleanupRequests.push({
          clearBasicFilter: { sheetId: preSheetId },
        });
      }
      // Conditional format rules'ni olib tashlash (teskari tartibda)
      const ruleCount = preSheet?.conditionalFormats?.length || 0;
      for (let i = ruleCount - 1; i >= 0; i--) {
        cleanupRequests.push({
          deleteConditionalFormatRule: { sheetId: preSheetId, index: i },
        });
      }
      if (cleanupRequests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests: cleanupRequests },
        });
      }
    }

    // 5. Eski ma'lumotlarni tozalash
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${sheetName}'!A:J`,
    });

    // ====== XODIMLAR JADVALI ======
    const now = new Date();
    const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear();
    const syncTime = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${currentYear} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const allRows: any[][] = [];

    // Sarlavha
    allRows.push([`XODIMLAR ISH HAQI VA AVANSLAR HISOBOTI — ${currentMonth} ${currentYear}`, '', '', '', '', '', '', '']);
    allRows.push([`Yangilangan: ${syncTime}`, '', '', '', '', '', '', '']);
    allRows.push([]); // Bo'sh satr

    // === BO'LIM 1: XODIMLAR RO'YXATI ===
    allRows.push(['№', 'Xodim Ismi', 'Lavozimi', 'Telefon', 'Ish rejimi', 'Oylik (so\'m)', 'Jami Avans (so\'m)', 'Jami Oylik (so\'m)', 'Qoldiq (so\'m)']);

    const staffHeaderRowIndex = allRows.length - 1; // 0-indexed = 3

    staff.forEach((member: any, idx: number) => {
      const name = member.fullName || member.full_name || 'Noma\'lum';
      const role = roleLabels[member.role] || member.role || '';
      const phone = member.phone || '';
      const schedule = member.workSchedule || member.work_schedule || '6/1';
      const salary = Number(member.salary || 0);
      const payments = staffPayments[name] || { avans: 0, oylik: 0 };
      const totalPaid = payments.avans + payments.oylik;
      const remaining = salary - totalPaid;

      allRows.push([
        idx + 1,
        name,
        role,
        phone,
        schedule,
        salary,
        payments.avans,
        payments.oylik,
        remaining,
      ]);
    });

    // Jami qator
    const staffDataStart = staffHeaderRowIndex + 2; // Sheet row (1-indexed)
    const staffDataEnd = staffDataStart + staff.length - 1;
    allRows.push([
      '',
      'JAMI:',
      '',
      '',
      '',
      `=SUM(F${staffDataStart}:F${staffDataEnd})`,
      `=SUM(G${staffDataStart}:G${staffDataEnd})`,
      `=SUM(H${staffDataStart}:H${staffDataEnd})`,
      `=SUM(I${staffDataStart}:I${staffDataEnd})`,
    ]);

    const totalRowIndex = allRows.length - 1;

    allRows.push([]); // Bo'sh satr
    allRows.push([]); // Bo'sh satr

    // === BO'LIM 2: TO'LOVLAR TARIXI ===
    allRows.push(['TO\'LOVLAR TARIXI', '', '', '', '', '', '', '']);
    const historyTitleRowIndex = allRows.length - 1;

    allRows.push(['№', 'Sana', 'Xodim Ismi', 'Lavozimi', 'To\'lov Turi', 'Summa (so\'m)', 'Izoh', '']);
    const historyHeaderRowIndex = allRows.length - 1;

    // To'lovlarni sanasi bo'yicha tartiblash
    const allPayments: any[] = [];
    for (const exp of salaryExpenses) {
      const namePart = exp.title?.split(' - ')?.[1]?.trim() || exp.title || '';
      const isAvans = exp.title?.toLowerCase()?.includes('avans');
      const matchedStaff = staff.find((s: any) => (s.fullName || s.full_name) === namePart);
      allPayments.push({
        date: exp.date?.split('T')?.[0] || '',
        name: namePart,
        role: matchedStaff ? (roleLabels[matchedStaff.role] || matchedStaff.role) : '',
        type: isAvans ? 'Avans' : 'Oylik',
        amount: Number(exp.amount || 0),
        comment: exp.comment || '',
      });
    }

    // Sanasi bo'yicha teskari tartiblash (eng yangi yuqorida)
    allPayments.sort((a, b) => b.date.localeCompare(a.date));

    if (allPayments.length === 0) {
      allRows.push(['', 'Hali to\'lov amalga oshirilmagan', '', '', '', '', '', '']);
    } else {
      allPayments.forEach((p, idx) => {
        allRows.push([
          idx + 1,
          p.date,
          p.name,
          p.role,
          p.type,
          p.amount,
          p.comment,
          '',
        ]);
      });
    }

    // 6. Yozish
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: allRows,
      },
    });

    // 7. Professional formatlash
    const sheet = (await sheets.spreadsheets.get({ spreadsheetId })).data.sheets?.find(
      s => s.properties?.title === sheetName
    );
    const sheetId = sheet?.properties?.sheetId;

    if (sheetId !== undefined) {
      const requests: any[] = [];

      // --- TITLE ROW (row 0) ---
      requests.push({
        mergeCells: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 9 },
          mergeType: 'MERGE_ALL',
        },
      });
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 9 },
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
      // Row height for title
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
          properties: { pixelSize: 45 },
          fields: 'pixelSize',
        },
      });

      // --- SUBTITLE ROW (row 1) ---
      requests.push({
        mergeCells: {
          range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 9 },
          mergeType: 'MERGE_ALL',
        },
      });
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 9 },
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

      // --- STAFF HEADER (row staffHeaderRowIndex) ---
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: staffHeaderRowIndex, endRowIndex: staffHeaderRowIndex + 1, startColumnIndex: 0, endColumnIndex: 9 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.15, green: 0.5, blue: 0.22 },
              textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 1, green: 1, blue: 1 } },
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
              borders: {
                bottom: { style: 'SOLID_MEDIUM', color: { red: 0.1, green: 0.35, blue: 0.15 } },
              },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,borders)',
        },
      });
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'ROWS', startIndex: staffHeaderRowIndex, endIndex: staffHeaderRowIndex + 1 },
          properties: { pixelSize: 35 },
          fields: 'pixelSize',
        },
      });

      // --- STAFF DATA ROWS (alternating colors) ---
      for (let i = 0; i < staff.length; i++) {
        const rowIdx = staffHeaderRowIndex + 1 + i;
        const isEven = i % 2 === 0;
        requests.push({
          repeatCell: {
            range: { sheetId, startRowIndex: rowIdx, endRowIndex: rowIdx + 1, startColumnIndex: 0, endColumnIndex: 9 },
            cell: {
              userEnteredFormat: {
                backgroundColor: isEven
                  ? { red: 1, green: 1, blue: 1 }
                  : { red: 0.95, green: 0.97, blue: 0.95 },
                textFormat: { fontSize: 10 },
                borders: {
                  bottom: { style: 'SOLID', color: { red: 0.85, green: 0.88, blue: 0.85 } },
                },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,borders)',
          },
        });
      }

      // --- TOTAL ROW ---
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: totalRowIndex, endRowIndex: totalRowIndex + 1, startColumnIndex: 0, endColumnIndex: 9 },
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

      // --- HISTORY TITLE ---
      requests.push({
        mergeCells: {
          range: { sheetId, startRowIndex: historyTitleRowIndex, endRowIndex: historyTitleRowIndex + 1, startColumnIndex: 0, endColumnIndex: 8 },
          mergeType: 'MERGE_ALL',
        },
      });
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: historyTitleRowIndex, endRowIndex: historyTitleRowIndex + 1, startColumnIndex: 0, endColumnIndex: 8 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.55, green: 0.27, blue: 0.07 },
              textFormat: { bold: true, fontSize: 12, foregroundColor: { red: 1, green: 1, blue: 1 } },
              horizontalAlignment: 'CENTER',
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
        },
      });
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'ROWS', startIndex: historyTitleRowIndex, endIndex: historyTitleRowIndex + 1 },
          properties: { pixelSize: 38 },
          fields: 'pixelSize',
        },
      });

      // --- HISTORY HEADER ---
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: historyHeaderRowIndex, endRowIndex: historyHeaderRowIndex + 1, startColumnIndex: 0, endColumnIndex: 8 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.75, green: 0.42, blue: 0.15 },
              textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 1, green: 1, blue: 1 } },
              horizontalAlignment: 'CENTER',
              borders: {
                bottom: { style: 'SOLID_MEDIUM', color: { red: 0.55, green: 0.27, blue: 0.07 } },
              },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,borders)',
        },
      });

      // --- HISTORY DATA ROWS ---
      const historyDataStart = historyHeaderRowIndex + 1;
      const historyDataEnd = historyDataStart + Math.max(allPayments.length, 1);
      for (let i = 0; i < Math.max(allPayments.length, 1); i++) {
        const rowIdx = historyDataStart + i;
        const isEven = i % 2 === 0;
        requests.push({
          repeatCell: {
            range: { sheetId, startRowIndex: rowIdx, endRowIndex: rowIdx + 1, startColumnIndex: 0, endColumnIndex: 8 },
            cell: {
              userEnteredFormat: {
                backgroundColor: isEven
                  ? { red: 1, green: 1, blue: 1 }
                  : { red: 0.98, green: 0.95, blue: 0.9 },
                textFormat: { fontSize: 10 },
                borders: {
                  bottom: { style: 'SOLID', color: { red: 0.9, green: 0.87, blue: 0.82 } },
                },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,borders)',
          },
        });
      }

      // --- NUMBER FORMAT for money columns ---
      // Staff money columns (F, G, H, I = index 5-8)
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: staffHeaderRowIndex + 1, endRowIndex: totalRowIndex + 1, startColumnIndex: 5, endColumnIndex: 9 },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'NUMBER', pattern: '#,##0' },
              horizontalAlignment: 'RIGHT',
            },
          },
          fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
        },
      });

      // History money column (F = index 5)
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: historyDataStart, endRowIndex: historyDataEnd, startColumnIndex: 5, endColumnIndex: 6 },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'NUMBER', pattern: '#,##0' },
              horizontalAlignment: 'RIGHT',
            },
          },
          fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
        },
      });

      // --- COLUMN WIDTHS ---
      const columnWidths = [40, 200, 130, 130, 90, 140, 140, 140, 140];
      columnWidths.forEach((w, i) => {
        requests.push({
          updateDimensionProperties: {
            range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
            properties: { pixelSize: w },
            fields: 'pixelSize',
          },
        });
      });

      // --- FREEZE ROWS ---
      requests.push({
        updateSheetProperties: {
          properties: { sheetId, gridProperties: { frozenRowCount: staffHeaderRowIndex + 1 } },
          fields: 'gridProperties.frozenRowCount',
        },
      });

      // --- CONDITIONAL FORMAT: Qoldiq < 0 = qizil ---
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{ sheetId, startRowIndex: staffHeaderRowIndex + 1, endRowIndex: totalRowIndex, startColumnIndex: 8, endColumnIndex: 9 }],
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

      // --- CONDITIONAL FORMAT: Qoldiq > 0 = yashil ---
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{ sheetId, startRowIndex: staffHeaderRowIndex + 1, endRowIndex: totalRowIndex, startColumnIndex: 8, endColumnIndex: 9 }],
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
      message: `${staff.length} ta xodim va ${allPayments.length} ta to'lov Google Sheets'ga sinxronlashtirildi`,
      totalStaff: staff.length,
      totalPayments: allPayments.length,
    });
  } catch (error: any) {
    console.error('Sync xatolik:', error?.message || error);
    return NextResponse.json({ success: false, error: error?.message || "Noma'lum xatolik" }, { status: 500 });
  }
}
