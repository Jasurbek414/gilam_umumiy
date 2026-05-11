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

const monthNames = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentyabr','Oktyabr','Noyabr','Dekabr'];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staff, expenses } = body;

    if (!staff || !Array.isArray(staff)) {
      return NextResponse.json({ success: false, error: "Xodimlar ro'yxati topilmadi" }, { status: 400 });
    }

    // Google Sheets Auth
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), 'credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1k8vMhWoQ9jy4CLl55ipGf7vq2VykAZ3bM_VV5yl8bgc';

    // ===== OYLIK VARAQLAR =====
    // Barcha to'lovlardan oy-yillarni aniqlash
    const salaryExpenses = (expenses || []).filter((e: any) =>
      e.category === 'Ish haqi' && (e.title?.includes('Avans') || e.title?.includes('Oylik'))
    );

    // Oylarni to'plash: joriy oy + to'lovlar mavjud oylar
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const monthKeys = new Set<string>([currentKey]);

    for (const exp of salaryExpenses) {
      const d = exp.date?.split('T')?.[0] || '';
      if (d) {
        const [y, m] = d.split('-');
        monthKeys.add(`${y}-${m}`);
      }
    }

    // Mavjud varaqlarni olish
    const sp = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = sp.data.sheets || [];
    const existingNames = existingSheets.map(s => s.properties?.title || '');

    // Har bir oy uchun varaq yaratish va to'ldirish
    const sortedMonths = Array.from(monthKeys).sort();
    let totalSynced = 0;

    for (const mk of sortedMonths) {
      const [yr, mo] = mk.split('-');
      const mIdx = parseInt(mo) - 1;
      const sheetName = `${monthNames[mIdx]} ${yr}`;
      const isCurrentMonth = mk === currentKey;

      // Agar eski oy va allaqachon mavjud bo'lsa — o'tkazib yuborish (saqlanadi!)
      if (!isCurrentMonth && existingNames.includes(sheetName)) {
        continue;
      }

      // Varaq yaratish (agar mavjud bo'lmasa)
      if (!existingNames.includes(sheetName)) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
        });
        existingNames.push(sheetName);
      }

      // Shu oy uchun to'lovlarni filtrlash
      const monthExpenses = salaryExpenses.filter((e: any) => {
        const d = e.date?.split('T')?.[0] || '';
        return d.startsWith(mk);
      });

      // Har xodim uchun to'lovlarni guruhlash
      const staffPayments: Record<string, any[]> = {};
      for (const m of staff) {
        staffPayments[m.fullName || m.full_name || ''] = [];
      }
      for (const exp of monthExpenses) {
        const namePart = exp.title?.split(' - ')?.[1]?.trim() || '';
        if (staffPayments[namePart]) {
          staffPayments[namePart].push({
            date: exp.date?.split('T')?.[0] || '',
            type: exp.title?.toLowerCase()?.includes('avans') ? 'Avans' : 'Oylik',
            amount: Number(exp.amount || 0),
            comment: exp.comment || '',
          });
        }
      }

      // ===== VARAQNI TOZALASH =====
      const preSheet = (await sheets.spreadsheets.get({ spreadsheetId })).data.sheets?.find(
        s => s.properties?.title === sheetName
      );
      const preSheetId = preSheet?.properties?.sheetId;
      if (preSheetId !== undefined) {
        const clean: any[] = [
          { unmergeCells: { range: { sheetId: preSheetId, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 20 } } },
        ];
        if (preSheet?.basicFilter) clean.push({ clearBasicFilter: { sheetId: preSheetId } });
        const rc = preSheet?.conditionalFormats?.length || 0;
        for (let i = rc - 1; i >= 0; i--) clean.push({ deleteConditionalFormatRule: { sheetId: preSheetId, index: i } });
        await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: clean } });
      }
      await sheets.spreadsheets.values.clear({ spreadsheetId, range: `'${sheetName}'!A:L` });

      // ===== MA'LUMOTLARNI YOZISH =====
      const syncTime = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const C = 11;
      const rows: any[][] = [];
      const types: string[] = [];

      // TITLE
      rows.push([`ISH HAQI VA AVANSLAR HISOBOTI — ${monthNames[mIdx]} ${yr}`, ...Array(C-1).fill('')]);
      types.push('title');

      // INFO
      let gAvans = 0, gOylik = 0, gSalary = 0;
      for (const m of staff) {
        const nm = m.fullName || m.full_name || '';
        const pp = staffPayments[nm] || [];
        gAvans += pp.filter((p:any) => p.type === 'Avans').reduce((s:number,p:any) => s + p.amount, 0);
        gOylik += pp.filter((p:any) => p.type === 'Oylik').reduce((s:number,p:any) => s + p.amount, 0);
        gSalary += Number(m.salary || 0);
      }
      rows.push([`Yangilangan: ${syncTime}  ·  Xodimlar: ${staff.length}  ·  Jami fond: ${gSalary.toLocaleString()} so'm  ·  Berilgan: ${(gAvans+gOylik).toLocaleString()} so'm  ·  Qoldiq: ${(gSalary-gAvans-gOylik).toLocaleString()} so'm`, ...Array(C-1).fill('')]);
      types.push('info');

      // EMPTY
      rows.push(Array(C).fill(''));
      types.push('empty');

      // HEADER
      rows.push(['№', 'Sana', 'F.I.O', 'Lavozimi', 'Tel. raqam', 'Ish rejimi', "To'lov turi", "Summa (so'm)", 'Izoh / Asoslash', "Jami berilgan", "Qoldiq (so'm)"]);
      types.push('header');
      const hIdx = rows.length - 1;

      let eNum = 0, tPay = 0;

      for (const member of staff) {
        const name = member.fullName || member.full_name || '';
        const role = roleLabels[member.role] || member.role || '';
        const phone = member.phone || '';
        const schedule = member.workSchedule || member.work_schedule || '6/1';
        const salary = Number(member.salary || 0);
        const payments = (staffPayments[name] || []).sort((a:any,b:any) => a.date.localeCompare(b.date));
        const mAvans = payments.filter((p:any) => p.type === 'Avans').reduce((s:number,p:any) => s + p.amount, 0);
        const mOylik = payments.filter((p:any) => p.type === 'Oylik').reduce((s:number,p:any) => s + p.amount, 0);
        const totalPaid = mAvans + mOylik;
        const remaining = salary - totalPaid;
        eNum++;

        if (payments.length === 0) {
          rows.push([eNum, '—', name, role, phone, schedule, '—', salary, "To'lov kutilmoqda", 0, remaining]);
          types.push('employee');
        } else {
          // Birinchi satr — xodim ma'lumotlari bilan
          rows.push([eNum, payments[0].date, name, role, phone, schedule, payments[0].type, payments[0].amount, payments[0].comment, totalPaid, remaining]);
          types.push('employee');
          tPay++;
          // Qolgan to'lovlar
          for (let i = 1; i < payments.length; i++) {
            rows.push(['', payments[i].date, '', '', '', '', payments[i].type, payments[i].amount, payments[i].comment, '', '']);
            types.push('payment');
            tPay++;
          }
        }
      }

      // JAMI
      rows.push(['', '', '▬▬▬  JAMI  ▬▬▬', '', `${eNum} xodim`, '', `${tPay} to'lov`, gAvans + gOylik, `Avans: ${gAvans.toLocaleString()} | Oylik: ${gOylik.toLocaleString()}`, gAvans + gOylik, gSalary - gAvans - gOylik]);
      types.push('total');

      // Imzo satrlari
      rows.push(Array(C).fill(''));
      types.push('empty');
      rows.push(Array(C).fill(''));
      types.push('empty');
      rows.push(['', '', 'Buxgalter: _______________', '', '', '', 'Direktor: _______________', '', '', "Sana: ___/___/______", '']);
      types.push('signature');

      // Yozish
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${sheetName}'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });

      // ===== FORMATLASH =====
      const sh = (await sheets.spreadsheets.get({ spreadsheetId })).data.sheets?.find(s => s.properties?.title === sheetName);
      const sid = sh?.properties?.sheetId;

      if (sid !== undefined) {
        const rq: any[] = [];
        const T = rows.length;

        // TITLE
        rq.push({ mergeCells: { range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: C }, mergeType: 'MERGE_ALL' } });
        rq.push({ repeatCell: {
          range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: C },
          cell: { userEnteredFormat: {
            backgroundColor: { red: 0.06, green: 0.12, blue: 0.25 },
            textFormat: { bold: true, fontSize: 14, fontFamily: 'Montserrat', foregroundColor: { red: 1, green: 1, blue: 1 } },
            horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE',
          }},
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
        }});
        rq.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 48 }, fields: 'pixelSize' } });

        // INFO BAR
        rq.push({ mergeCells: { range: { sheetId: sid, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: C }, mergeType: 'MERGE_ALL' } });
        rq.push({ repeatCell: {
          range: { sheetId: sid, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: C },
          cell: { userEnteredFormat: {
            backgroundColor: { red: 0.1, green: 0.18, blue: 0.35 },
            textFormat: { fontSize: 9, fontFamily: 'Roboto', foregroundColor: { red: 0.7, green: 0.82, blue: 0.95 } },
            horizontalAlignment: 'CENTER',
          }},
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
        }});

        // HEADER
        rq.push({ repeatCell: {
          range: { sheetId: sid, startRowIndex: hIdx, endRowIndex: hIdx+1, startColumnIndex: 0, endColumnIndex: C },
          cell: { userEnteredFormat: {
            backgroundColor: { red: 0.14, green: 0.45, blue: 0.22 },
            textFormat: { bold: true, fontSize: 10, fontFamily: 'Roboto', foregroundColor: { red: 1, green: 1, blue: 1 } },
            horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE',
            borders: { bottom: { style: 'SOLID_MEDIUM', color: { red: 0.08, green: 0.3, blue: 0.12 } } },
          }},
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,borders)',
        }});
        rq.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'ROWS', startIndex: hIdx, endIndex: hIdx+1 }, properties: { pixelSize: 34 }, fields: 'pixelSize' } });

        // DATA ROWS
        for (let i = hIdx+1; i < T; i++) {
          const rt = types[i];
          if (rt === 'employee') {
            rq.push({ repeatCell: {
              range: { sheetId: sid, startRowIndex: i, endRowIndex: i+1, startColumnIndex: 0, endColumnIndex: C },
              cell: { userEnteredFormat: {
                backgroundColor: { red: 0.93, green: 0.95, blue: 1 },
                textFormat: { bold: true, fontSize: 10, fontFamily: 'Roboto' },
                verticalAlignment: 'MIDDLE',
                borders: {
                  top: { style: 'SOLID', color: { red: 0.72, green: 0.78, blue: 0.9 } },
                  bottom: { style: 'SOLID', color: { red: 0.82, green: 0.86, blue: 0.93 } },
                  left: { style: 'SOLID', color: { red: 0.82, green: 0.86, blue: 0.93 } },
                  right: { style: 'SOLID', color: { red: 0.82, green: 0.86, blue: 0.93 } },
                },
              }},
              fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment,borders)',
            }});
          } else if (rt === 'payment') {
            rq.push({ repeatCell: {
              range: { sheetId: sid, startRowIndex: i, endRowIndex: i+1, startColumnIndex: 0, endColumnIndex: C },
              cell: { userEnteredFormat: {
                backgroundColor: { red: 0.98, green: 0.98, blue: 0.99 },
                textFormat: { fontSize: 9, fontFamily: 'Roboto', foregroundColor: { red: 0.38, green: 0.38, blue: 0.42 } },
                borders: {
                  bottom: { style: 'DOTTED', color: { red: 0.88, green: 0.88, blue: 0.9 } },
                  left: { style: 'SOLID', color: { red: 0.92, green: 0.92, blue: 0.94 } },
                  right: { style: 'SOLID', color: { red: 0.92, green: 0.92, blue: 0.94 } },
                },
              }},
              fields: 'userEnteredFormat(backgroundColor,textFormat,borders)',
            }});
          } else if (rt === 'total') {
            rq.push({ repeatCell: {
              range: { sheetId: sid, startRowIndex: i, endRowIndex: i+1, startColumnIndex: 0, endColumnIndex: C },
              cell: { userEnteredFormat: {
                backgroundColor: { red: 0.06, green: 0.12, blue: 0.25 },
                textFormat: { bold: true, fontSize: 11, fontFamily: 'Roboto', foregroundColor: { red: 1, green: 1, blue: 1 } },
                horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE',
                borders: {
                  top: { style: 'SOLID_THICK', color: { red: 0.06, green: 0.12, blue: 0.25 } },
                  bottom: { style: 'SOLID_THICK', color: { red: 0.06, green: 0.12, blue: 0.25 } },
                },
              }},
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,borders)',
            }});
            rq.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'ROWS', startIndex: i, endIndex: i+1 }, properties: { pixelSize: 38 }, fields: 'pixelSize' } });
          } else if (rt === 'signature') {
            rq.push({ repeatCell: {
              range: { sheetId: sid, startRowIndex: i, endRowIndex: i+1, startColumnIndex: 0, endColumnIndex: C },
              cell: { userEnteredFormat: {
                textFormat: { fontSize: 10, fontFamily: 'Roboto', foregroundColor: { red: 0.3, green: 0.3, blue: 0.35 } },
                borders: { top: { style: 'DOTTED', color: { red: 0.6, green: 0.6, blue: 0.65 } } },
              }},
              fields: 'userEnteredFormat(textFormat,borders)',
            }});
          }
        }

        // CONDITIONAL FORMATS
        const totalRowIdx = types.lastIndexOf('total') + hIdx;
        // Avans = ko'k
        rq.push({ addConditionalFormatRule: { rule: {
          ranges: [{ sheetId: sid, startRowIndex: hIdx+1, endRowIndex: T, startColumnIndex: 6, endColumnIndex: 7 }],
          booleanRule: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Avans' }] },
            format: { backgroundColor: { red: 0.87, green: 0.92, blue: 1 }, textFormat: { foregroundColor: { red: 0.12, green: 0.32, blue: 0.68 }, bold: true } } },
        }, index: 0 }});
        // Oylik = yashil
        rq.push({ addConditionalFormatRule: { rule: {
          ranges: [{ sheetId: sid, startRowIndex: hIdx+1, endRowIndex: T, startColumnIndex: 6, endColumnIndex: 7 }],
          booleanRule: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Oylik' }] },
            format: { backgroundColor: { red: 0.84, green: 0.96, blue: 0.84 }, textFormat: { foregroundColor: { red: 0.08, green: 0.48, blue: 0.16 }, bold: true } } },
        }, index: 1 }});
        // Qoldiq > 0 = yashil
        rq.push({ addConditionalFormatRule: { rule: {
          ranges: [{ sheetId: sid, startRowIndex: hIdx+1, endRowIndex: T-3, startColumnIndex: 10, endColumnIndex: 11 }],
          booleanRule: { condition: { type: 'NUMBER_GREATER', values: [{ userEnteredValue: '0' }] },
            format: { backgroundColor: { red: 0.87, green: 1, blue: 0.87 }, textFormat: { foregroundColor: { red: 0.06, green: 0.46, blue: 0.12 }, bold: true } } },
        }, index: 2 }});
        // Qoldiq < 0 = qizil
        rq.push({ addConditionalFormatRule: { rule: {
          ranges: [{ sheetId: sid, startRowIndex: hIdx+1, endRowIndex: T-3, startColumnIndex: 10, endColumnIndex: 11 }],
          booleanRule: { condition: { type: 'NUMBER_LESS', values: [{ userEnteredValue: '0' }] },
            format: { backgroundColor: { red: 1, green: 0.87, blue: 0.87 }, textFormat: { foregroundColor: { red: 0.78, green: 0.08, blue: 0.08 }, bold: true } } },
        }, index: 3 }});
        // Qoldiq = 0 = sariq
        rq.push({ addConditionalFormatRule: { rule: {
          ranges: [{ sheetId: sid, startRowIndex: hIdx+1, endRowIndex: T-3, startColumnIndex: 10, endColumnIndex: 11 }],
          booleanRule: { condition: { type: 'NUMBER_EQ', values: [{ userEnteredValue: '0' }] },
            format: { backgroundColor: { red: 0.96, green: 0.94, blue: 0.84 }, textFormat: { foregroundColor: { red: 0.52, green: 0.45, blue: 0.15 }, bold: true } } },
        }, index: 4 }});

        // NUMBER FORMAT
        rq.push({ repeatCell: {
          range: { sheetId: sid, startRowIndex: hIdx+1, endRowIndex: T, startColumnIndex: 7, endColumnIndex: 8 },
          cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0' }, horizontalAlignment: 'RIGHT' } },
          fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
        }});
        rq.push({ repeatCell: {
          range: { sheetId: sid, startRowIndex: hIdx+1, endRowIndex: T, startColumnIndex: 9, endColumnIndex: 11 },
          cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0' }, horizontalAlignment: 'RIGHT' } },
          fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
        }});
        // № center
        rq.push({ repeatCell: {
          range: { sheetId: sid, startRowIndex: hIdx+1, endRowIndex: T, startColumnIndex: 0, endColumnIndex: 1 },
          cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } },
          fields: 'userEnteredFormat(horizontalAlignment)',
        }});

        // COLUMN WIDTHS
        [35, 95, 180, 120, 125, 75, 90, 120, 200, 115, 120].forEach((w, idx) => {
          rq.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'COLUMNS', startIndex: idx, endIndex: idx+1 }, properties: { pixelSize: w }, fields: 'pixelSize' } });
        });

        // FREEZE + FILTER
        rq.push({ updateSheetProperties: { properties: { sheetId: sid, gridProperties: { frozenRowCount: hIdx + 1 } }, fields: 'gridProperties.frozenRowCount' } });
        rq.push({ setBasicFilter: { filter: { range: { sheetId: sid, startRowIndex: hIdx, startColumnIndex: 0, endColumnIndex: C, endRowIndex: T-3 } } } });

        await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: rq } });
      }

      totalSynced++;
    }

    return NextResponse.json({
      success: true,
      message: `${staff.length} xodim, ${sortedMonths.length} oy hisoboti sinxronlashtirildi`,
      totalStaff: staff.length,
      monthsUpdated: totalSynced,
    });
  } catch (error: any) {
    console.error('Sync xatolik:', error?.message || error);
    return NextResponse.json({ success: false, error: error?.message || "Noma'lum xatolik" }, { status: 500 });
  }
}
