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

    const salaryExpenses = (expenses || []).filter((e: any) =>
      e.category === 'Ish haqi' && (e.title?.includes('Avans') || e.title?.includes('Oylik'))
    );

    // Har bir xodim uchun to'lovlarni guruhlash
    const staffPayments: Record<string, any[]> = {};
    for (const m of staff) {
      staffPayments[m.fullName || m.full_name || ''] = [];
    }
    for (const exp of salaryExpenses) {
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

    // Google Sheets
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), 'credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1k8vMhWoQ9jy4CLl55ipGf7vq2VykAZ3bM_VV5yl8bgc';
    const sheetName = 'Ish haqi va Avanslar';

    // Varaq yaratish
    const sp = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = sp.data.sheets?.map(s => s.properties?.title) || [];
    if (!existingSheets.includes(sheetName)) {
      await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] } });
    }

    // Tozalash
    const preSheet = (await sheets.spreadsheets.get({ spreadsheetId })).data.sheets?.find(s => s.properties?.title === sheetName);
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
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: `'${sheetName}'!A:K` });

    // ======= MA'LUMOTLARNI TAYYORLASH =======
    const now = new Date();
    const months = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentyabr','Oktyabr','Noyabr','Dekabr'];
    const syncTime = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    const C = 10; // ustunlar soni
    const rows: any[][] = [];
    const types: string[] = []; // row type

    // === ROW 0: TITLE ===
    rows.push(['GILAM PLATFORMASI — ISH HAQI VA AVANSLAR HISOBOTI', ...Array(C-1).fill('')]);
    types.push('title');

    // === ROW 1: Info bar ===
    let totalStaffCount = staff.length;
    let grandAvans = 0, grandOylik = 0, grandSalary = 0;
    for (const m of staff) {
      const name = m.fullName || m.full_name || '';
      const payments = staffPayments[name] || [];
      const mAvans = payments.filter((p:any) => p.type === 'Avans').reduce((s:number,p:any) => s + p.amount, 0);
      const mOylik = payments.filter((p:any) => p.type === 'Oylik').reduce((s:number,p:any) => s + p.amount, 0);
      grandAvans += mAvans;
      grandOylik += mOylik;
      grandSalary += Number(m.salary || 0);
    }
    rows.push([`📅 ${syncTime}  •  ${months[now.getMonth()]} ${now.getFullYear()}  •  👥 ${totalStaffCount} xodim  •  💰 Jami oylik: ${grandSalary.toLocaleString()} so'm`, ...Array(C-1).fill('')]);
    types.push('info');

    // === ROW 2: Statistika ===
    rows.push([`✅ Jami berilgan avans: ${grandAvans.toLocaleString()} so'm  •  ✅ Jami berilgan oylik: ${grandOylik.toLocaleString()} so'm  •  📊 Qoldiq: ${(grandSalary - grandAvans - grandOylik).toLocaleString()} so'm`, ...Array(C-1).fill('')]);
    types.push('stats');

    // === ROW 3: BO'SH ===
    rows.push(Array(C).fill(''));
    types.push('empty');

    // === ROW 4: HEADER ===
    rows.push(['№', 'Sana', 'Xodim Ismi', 'Lavozimi', 'Telefon', 'Ish rejimi', "To'lov Turi", "Summa (so'm)", 'Izoh', "Qoldiq (so'm)"]);
    types.push('header');
    const hdrIdx = rows.length - 1;

    let empNum = 0, totalPayments = 0;

    for (const member of staff) {
      const name = member.fullName || member.full_name || '';
      const role = roleLabels[member.role] || member.role || '';
      const phone = member.phone || '';
      const schedule = member.workSchedule || member.work_schedule || '6/1';
      const salary = Number(member.salary || 0);
      const payments = (staffPayments[name] || []).sort((a:any,b:any) => b.date.localeCompare(a.date));
      const mAvans = payments.filter((p:any) => p.type === 'Avans').reduce((s:number,p:any) => s + p.amount, 0);
      const mOylik = payments.filter((p:any) => p.type === 'Oylik').reduce((s:number,p:any) => s + p.amount, 0);
      const remaining = salary - mAvans - mOylik;
      empNum++;

      if (payments.length === 0) {
        rows.push([empNum, '—', name, role, phone, schedule, '—', salary, "To'lov kutilmoqda", remaining]);
        types.push('employee');
      } else {
        rows.push([empNum, payments[0].date, name, role, phone, schedule, payments[0].type, payments[0].amount, payments[0].comment, remaining]);
        types.push('employee');
        totalPayments++;
        for (let i = 1; i < payments.length; i++) {
          rows.push(['', payments[i].date, '', '', '', '', payments[i].type, payments[i].amount, payments[i].comment, '']);
          types.push('payment');
          totalPayments++;
        }
      }
    }

    // === JAMI ROW ===
    rows.push(['', '', '═══ JAMI ═══', '', `${empNum} xodim`, '', `${totalPayments} ta to'lov`, grandAvans + grandOylik, '', grandSalary - grandAvans - grandOylik]);
    types.push('total');
    const totalIdx = rows.length - 1;

    // Yozish
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });

    // ======= FORMATLASH =======
    const sh = (await sheets.spreadsheets.get({ spreadsheetId })).data.sheets?.find(s => s.properties?.title === sheetName);
    const sid = sh?.properties?.sheetId;

    if (sid !== undefined) {
      const rq: any[] = [];
      const T = rows.length;

      // --- TITLE ---
      rq.push({ mergeCells: { range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: C }, mergeType: 'MERGE_ALL' } });
      rq.push({ repeatCell: {
        range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: C },
        cell: { userEnteredFormat: {
          backgroundColor: { red: 0.08, green: 0.16, blue: 0.32 },
          textFormat: { bold: true, fontSize: 15, fontFamily: 'Montserrat', foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE',
          padding: { top: 8, bottom: 8 },
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)',
      }});
      rq.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 50 }, fields: 'pixelSize' } });

      // --- INFO BAR ---
      rq.push({ mergeCells: { range: { sheetId: sid, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: C }, mergeType: 'MERGE_ALL' } });
      rq.push({ repeatCell: {
        range: { sheetId: sid, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: C },
        cell: { userEnteredFormat: {
          backgroundColor: { red: 0.13, green: 0.22, blue: 0.42 },
          textFormat: { fontSize: 10, fontFamily: 'Roboto', foregroundColor: { red: 0.82, green: 0.87, blue: 0.95 } },
          horizontalAlignment: 'CENTER',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }});

      // --- STATS BAR ---
      rq.push({ mergeCells: { range: { sheetId: sid, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: C }, mergeType: 'MERGE_ALL' } });
      rq.push({ repeatCell: {
        range: { sheetId: sid, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: C },
        cell: { userEnteredFormat: {
          backgroundColor: { red: 0.18, green: 0.30, blue: 0.52 },
          textFormat: { fontSize: 10, fontFamily: 'Roboto', foregroundColor: { red: 0.75, green: 0.88, blue: 0.65 } },
          horizontalAlignment: 'CENTER',
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      }});

      // --- HEADER ---
      rq.push({ repeatCell: {
        range: { sheetId: sid, startRowIndex: hdrIdx, endRowIndex: hdrIdx + 1, startColumnIndex: 0, endColumnIndex: C },
        cell: { userEnteredFormat: {
          backgroundColor: { red: 0.16, green: 0.50, blue: 0.27 },
          textFormat: { bold: true, fontSize: 10, fontFamily: 'Roboto', foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE',
          borders: {
            bottom: { style: 'SOLID_MEDIUM', color: { red: 0.1, green: 0.35, blue: 0.18 } },
          },
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,borders)',
      }});
      rq.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'ROWS', startIndex: hdrIdx, endIndex: hdrIdx + 1 }, properties: { pixelSize: 36 }, fields: 'pixelSize' } });

      // --- DATA ROWS ---
      for (let i = hdrIdx + 1; i < T; i++) {
        const rt = types[i];
        if (rt === 'employee') {
          rq.push({ repeatCell: {
            range: { sheetId: sid, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 0, endColumnIndex: C },
            cell: { userEnteredFormat: {
              backgroundColor: { red: 0.94, green: 0.96, blue: 1 },
              textFormat: { bold: true, fontSize: 10, fontFamily: 'Roboto' },
              verticalAlignment: 'MIDDLE',
              borders: {
                top: { style: 'SOLID', color: { red: 0.75, green: 0.82, blue: 0.93 } },
                bottom: { style: 'SOLID', color: { red: 0.85, green: 0.89, blue: 0.95 } },
                left: { style: 'SOLID', color: { red: 0.85, green: 0.89, blue: 0.95 } },
                right: { style: 'SOLID', color: { red: 0.85, green: 0.89, blue: 0.95 } },
              },
            }},
            fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment,borders)',
          }});
          rq.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'ROWS', startIndex: i, endIndex: i + 1 }, properties: { pixelSize: 30 }, fields: 'pixelSize' } });
        } else if (rt === 'payment') {
          rq.push({ repeatCell: {
            range: { sheetId: sid, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 0, endColumnIndex: C },
            cell: { userEnteredFormat: {
              backgroundColor: { red: 0.99, green: 0.99, blue: 0.99 },
              textFormat: { fontSize: 9, fontFamily: 'Roboto', foregroundColor: { red: 0.4, green: 0.4, blue: 0.45 } },
              borders: {
                bottom: { style: 'DOTTED', color: { red: 0.9, green: 0.9, blue: 0.92 } },
                left: { style: 'SOLID', color: { red: 0.92, green: 0.92, blue: 0.94 } },
                right: { style: 'SOLID', color: { red: 0.92, green: 0.92, blue: 0.94 } },
              },
            }},
            fields: 'userEnteredFormat(backgroundColor,textFormat,borders)',
          }});
          rq.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'ROWS', startIndex: i, endIndex: i + 1 }, properties: { pixelSize: 26 }, fields: 'pixelSize' } });
        } else if (rt === 'total') {
          rq.push({ repeatCell: {
            range: { sheetId: sid, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 0, endColumnIndex: C },
            cell: { userEnteredFormat: {
              backgroundColor: { red: 0.08, green: 0.16, blue: 0.32 },
              textFormat: { bold: true, fontSize: 11, fontFamily: 'Roboto', foregroundColor: { red: 1, green: 1, blue: 1 } },
              horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE',
              borders: {
                top: { style: 'SOLID_THICK', color: { red: 0.08, green: 0.16, blue: 0.32 } },
                bottom: { style: 'SOLID_THICK', color: { red: 0.08, green: 0.16, blue: 0.32 } },
              },
            }},
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,borders)',
          }});
          rq.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'ROWS', startIndex: i, endIndex: i + 1 }, properties: { pixelSize: 38 }, fields: 'pixelSize' } });
        }
      }

      // --- To'lov turi ustuni ranglash (Avans = ko'k, Oylik = yashil) ---
      // Avans conditional
      rq.push({ addConditionalFormatRule: { rule: {
        ranges: [{ sheetId: sid, startRowIndex: hdrIdx+1, endRowIndex: T, startColumnIndex: 6, endColumnIndex: 7 }],
        booleanRule: {
          condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Avans' }] },
          format: {
            backgroundColor: { red: 0.88, green: 0.93, blue: 1 },
            textFormat: { foregroundColor: { red: 0.15, green: 0.35, blue: 0.7 }, bold: true },
          },
        },
      }, index: 0 }});
      // Oylik conditional
      rq.push({ addConditionalFormatRule: { rule: {
        ranges: [{ sheetId: sid, startRowIndex: hdrIdx+1, endRowIndex: T, startColumnIndex: 6, endColumnIndex: 7 }],
        booleanRule: {
          condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Oylik' }] },
          format: {
            backgroundColor: { red: 0.85, green: 0.96, blue: 0.85 },
            textFormat: { foregroundColor: { red: 0.1, green: 0.5, blue: 0.18 }, bold: true },
          },
        },
      }, index: 1 }});

      // Qoldiq < 0 = qizil
      rq.push({ addConditionalFormatRule: { rule: {
        ranges: [{ sheetId: sid, startRowIndex: hdrIdx+1, endRowIndex: totalIdx, startColumnIndex: 9, endColumnIndex: 10 }],
        booleanRule: {
          condition: { type: 'NUMBER_LESS', values: [{ userEnteredValue: '0' }] },
          format: {
            backgroundColor: { red: 1, green: 0.88, blue: 0.88 },
            textFormat: { foregroundColor: { red: 0.8, green: 0.1, blue: 0.1 }, bold: true },
          },
        },
      }, index: 2 }});
      // Qoldiq > 0 = yashil
      rq.push({ addConditionalFormatRule: { rule: {
        ranges: [{ sheetId: sid, startRowIndex: hdrIdx+1, endRowIndex: totalIdx, startColumnIndex: 9, endColumnIndex: 10 }],
        booleanRule: {
          condition: { type: 'NUMBER_GREATER', values: [{ userEnteredValue: '0' }] },
          format: {
            backgroundColor: { red: 0.88, green: 1, blue: 0.88 },
            textFormat: { foregroundColor: { red: 0.08, green: 0.48, blue: 0.15 }, bold: true },
          },
        },
      }, index: 3 }});
      // Qoldiq = 0
      rq.push({ addConditionalFormatRule: { rule: {
        ranges: [{ sheetId: sid, startRowIndex: hdrIdx+1, endRowIndex: totalIdx, startColumnIndex: 9, endColumnIndex: 10 }],
        booleanRule: {
          condition: { type: 'NUMBER_EQ', values: [{ userEnteredValue: '0' }] },
          format: {
            backgroundColor: { red: 0.95, green: 0.95, blue: 0.88 },
            textFormat: { foregroundColor: { red: 0.5, green: 0.45, blue: 0.2 }, bold: true },
          },
        },
      }, index: 4 }});

      // --- NUMBER FORMAT ---
      rq.push({ repeatCell: {
        range: { sheetId: sid, startRowIndex: hdrIdx+1, endRowIndex: T, startColumnIndex: 7, endColumnIndex: 8 },
        cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0' }, horizontalAlignment: 'RIGHT' } },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
      }});
      rq.push({ repeatCell: {
        range: { sheetId: sid, startRowIndex: hdrIdx+1, endRowIndex: T, startColumnIndex: 9, endColumnIndex: 10 },
        cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0' }, horizontalAlignment: 'RIGHT' } },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
      }});

      // --- № CENTER ---
      rq.push({ repeatCell: {
        range: { sheetId: sid, startRowIndex: hdrIdx+1, endRowIndex: T, startColumnIndex: 0, endColumnIndex: 1 },
        cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat(horizontalAlignment)',
      }});

      // --- COLUMN WIDTHS ---
      [40, 100, 180, 130, 130, 80, 95, 130, 200, 130].forEach((w, i) => {
        rq.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'COLUMNS', startIndex: i, endIndex: i+1 }, properties: { pixelSize: w }, fields: 'pixelSize' } });
      });

      // --- FREEZE ---
      rq.push({ updateSheetProperties: { properties: { sheetId: sid, gridProperties: { frozenRowCount: hdrIdx + 1 } }, fields: 'gridProperties.frozenRowCount' } });

      // --- FILTER ---
      rq.push({ setBasicFilter: { filter: { range: { sheetId: sid, startRowIndex: hdrIdx, startColumnIndex: 0, endColumnIndex: C, endRowIndex: T } } } });

      await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: rq } });
    }

    return NextResponse.json({
      success: true,
      message: `${empNum} ta xodim va ${totalPayments} ta to'lov sinxronlashtirildi`,
      totalStaff: empNum, totalPayments,
    });
  } catch (error: any) {
    console.error('Sync xatolik:', error?.message || error);
    return NextResponse.json({ success: false, error: error?.message || "Noma'lum xatolik" }, { status: 500 });
  }
}
