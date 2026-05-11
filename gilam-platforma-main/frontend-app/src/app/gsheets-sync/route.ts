import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';

const ROLES: Record<string,string> = { SUPER_ADMIN:'Super Admin', COMPANY_ADMIN:'Kompaniya Admin', MANAGER:'Menejer', OPERATOR:'Operator', DRIVER:'Haydovchi', WORKER:'Ishchi' };
const MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentyabr','Oktyabr','Noyabr','Dekabr'];

async function getSheets() {
  const auth = new google.auth.GoogleAuth({ keyFile: path.join(process.cwd(), 'credentials.json'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  return google.sheets({ version: 'v4', auth });
}
const SID = '1k8vMhWoQ9jy4CLl55ipGf7vq2VykAZ3bM_VV5yl8bgc';

async function ensureSheet(sheets: any, name: string, existing: string[]) {
  if (!existing.includes(name)) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: SID, requestBody: { requests: [{ addSheet: { properties: { title: name } } }] } });
    existing.push(name);
  }
}

async function cleanSheet(sheets: any, name: string, cols: number) {
  const sp = await sheets.spreadsheets.get({ spreadsheetId: SID });
  const sh = sp.data.sheets?.find((s:any) => s.properties?.title === name);
  const sid = sh?.properties?.sheetId;
  if (sid === undefined) return;
  const rq: any[] = [{ unmergeCells: { range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 20 } } }];
  if (sh?.basicFilter) rq.push({ clearBasicFilter: { sheetId: sid } });
  const rc = sh?.conditionalFormats?.length || 0;
  for (let i = rc-1; i >= 0; i--) rq.push({ deleteConditionalFormatRule: { sheetId: sid, index: i } });
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: SID, requestBody: { requests: rq } });
  await sheets.spreadsheets.values.clear({ spreadsheetId: SID, range: `'${name}'!A:${String.fromCharCode(64+cols)}` });
}

function fmt(sid: number, r0: number, r1: number, c0: number, c1: number, bg: any, txt: any, bold=false, sz=10, align='LEFT') {
  return { repeatCell: { range: { sheetId: sid, startRowIndex: r0, endRowIndex: r1, startColumnIndex: c0, endColumnIndex: c1 }, cell: { userEnteredFormat: { backgroundColor: bg, textFormat: { bold, fontSize: sz, foregroundColor: txt }, horizontalAlignment: align } }, fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)' } };
}

// ==================== MIJOZLAR ====================
async function syncCustomers(sheets: any, customers: any[], existing: string[]) {
  const name = 'Mijozlar royxati';
  await ensureSheet(sheets, name, existing);
  await cleanSheet(sheets, name, 8);
  const now = new Date();
  const rows: any[][] = [
    [`MIJOZLAR RO'YXATI — ${customers.length} ta mijoz`, '', '', '', '', '', '', ''],
    [`Yangilangan: ${now.toLocaleDateString('uz')} ${now.toLocaleTimeString('uz',{hour:'2-digit',minute:'2-digit'})}`, '', '', '', '', '', '', ''],
    [],
    ['№', 'F.I.O', 'Telefon 1', 'Telefon 2', 'Manzil', "Qo'shilgan sana", 'Buyurtmalar', 'Izoh'],
  ];
  customers.forEach((c: any, i: number) => {
    rows.push([i+1, c.fullName||c.full_name||'', c.phone||'', c.phone2||'', c.address||'', c.createdAt?.split('T')?.[0]||'', '', '']);
  });
  rows.push([], ['', `JAMI: ${customers.length} ta mijoz`, '', '', '', '', '', '']);

  await sheets.spreadsheets.values.update({ spreadsheetId: SID, range: `'${name}'!A1`, valueInputOption: 'USER_ENTERED', requestBody: { values: rows } });

  const sp = await sheets.spreadsheets.get({ spreadsheetId: SID });
  const sid = sp.data.sheets?.find((s:any) => s.properties?.title === name)?.properties?.sheetId;
  if (sid === undefined) return;
  const T = rows.length;
  const rq: any[] = [
    { mergeCells: { range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 }, mergeType: 'MERGE_ALL' } },
    fmt(sid, 0, 1, 0, 8, {red:.06,green:.12,blue:.25}, {red:1,green:1,blue:1}, true, 14, 'CENTER'),
    { updateDimensionProperties: { range: { sheetId: sid, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 45 }, fields: 'pixelSize' } },
    { mergeCells: { range: { sheetId: sid, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 8 }, mergeType: 'MERGE_ALL' } },
    fmt(sid, 1, 2, 0, 8, {red:.1,green:.18,blue:.35}, {red:.7,green:.82,blue:.95}, false, 9, 'CENTER'),
    fmt(sid, 3, 4, 0, 8, {red:.14,green:.45,blue:.22}, {red:1,green:1,blue:1}, true, 10, 'CENTER'),
    { updateDimensionProperties: { range: { sheetId: sid, dimension: 'ROWS', startIndex: 3, endIndex: 4 }, properties: { pixelSize: 34 }, fields: 'pixelSize' } },
    { updateSheetProperties: { properties: { sheetId: sid, gridProperties: { frozenRowCount: 4 } }, fields: 'gridProperties.frozenRowCount' } },
    { setBasicFilter: { filter: { range: { sheetId: sid, startRowIndex: 3, startColumnIndex: 0, endColumnIndex: 8, endRowIndex: T-2 } } } },
  ];
  [35,180,130,130,200,110,80,150].forEach((w,i) => rq.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'COLUMNS', startIndex: i, endIndex: i+1 }, properties: { pixelSize: w }, fields: 'pixelSize' } }));
  for (let i = 4; i < T-2; i++) rq.push(fmt(sid, i, i+1, 0, 8, i%2===0?{red:.98,green:.98,blue:1}:{red:1,green:1,blue:1}, {red:.15,green:.15,blue:.2}, false, 10));
  rq.push(fmt(sid, T-1, T, 0, 8, {red:.06,green:.12,blue:.25}, {red:1,green:1,blue:1}, true, 11, 'CENTER'));
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: SID, requestBody: { requests: rq } });
}

// ==================== MOLIYAVIY HISOBOT ====================
async function syncFinance(sheets: any, expenses: any[], existing: string[]) {
  const name = 'Moliyaviy Hisobot';
  await ensureSheet(sheets, name, existing);
  await cleanSheet(sheets, name, 8);
  const now = new Date();
  // Kategoriyalar bo'yicha guruhlash
  const cats: Record<string, { kirim: number; chiqim: number }> = {};
  let totalKirim = 0, totalChiqim = 0;
  for (const e of expenses) {
    const cat = e.category || 'Boshqa';
    if (!cats[cat]) cats[cat] = { kirim: 0, chiqim: 0 };
    const amt = Number(e.amount || 0);
    cats[cat].chiqim += amt;
    totalChiqim += amt;
  }

  const rows: any[][] = [
    ['MOLIYAVIY HISOBOT', '', '', '', '', 'XULOSA', '', ''],
    [`Yangilangan: ${now.toLocaleDateString('uz')}`, '', '', '', '', '', '', ''],
    [],
    ['№', 'Sana', 'Kategoriya', 'Nomi', "Summa (so'm)", 'Izoh', '', ''],
  ];
  const hIdx = 3;

  expenses.sort((a:any,b:any) => (b.date||'').localeCompare(a.date||''));
  expenses.forEach((e: any, i: number) => {
    rows.push([i+1, e.date?.split('T')?.[0]||'', e.category||'', e.title||'', Number(e.amount||0), e.comment||'', '', '']);
  });
  rows.push([], ['', '', 'JAMI CHIQIM:', '', totalChiqim, '', '', '']);

  // Xulosa (o'ng tomon)
  rows[2] = ['', '', '', '', '', 'Kategoriya', 'Chiqim', ''];
  let ri = 3;
  for (const [cat, v] of Object.entries(cats)) {
    if (!rows[ri]) rows[ri] = Array(8).fill('');
    rows[ri][5] = cat; rows[ri][6] = v.chiqim;
    ri++;
  }
  if (!rows[ri]) rows[ri] = Array(8).fill('');
  rows[ri][5] = 'JAMI:'; rows[ri][6] = totalChiqim;

  await sheets.spreadsheets.values.update({ spreadsheetId: SID, range: `'${name}'!A1`, valueInputOption: 'USER_ENTERED', requestBody: { values: rows } });

  const sp = await sheets.spreadsheets.get({ spreadsheetId: SID });
  const sid = sp.data.sheets?.find((s:any) => s.properties?.title === name)?.properties?.sheetId;
  if (sid === undefined) return;
  const T = rows.length;
  const rq: any[] = [
    { mergeCells: { range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 5 }, mergeType: 'MERGE_ALL' } },
    fmt(sid, 0, 1, 0, 5, {red:.06,green:.12,blue:.25}, {red:1,green:1,blue:1}, true, 14, 'CENTER'),
    { updateDimensionProperties: { range: { sheetId: sid, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 45 }, fields: 'pixelSize' } },
    fmt(sid, hIdx, hIdx+1, 0, 6, {red:.14,green:.45,blue:.22}, {red:1,green:1,blue:1}, true, 10, 'CENTER'),
    fmt(sid, 2, 3, 5, 8, {red:.55,green:.27,blue:.07}, {red:1,green:1,blue:1}, true, 10, 'CENTER'),
    { updateSheetProperties: { properties: { sheetId: sid, gridProperties: { frozenRowCount: hIdx+1 } }, fields: 'gridProperties.frozenRowCount' } },
    { repeatCell: { range: { sheetId: sid, startRowIndex: hIdx+1, endRowIndex: T, startColumnIndex: 4, endColumnIndex: 5 }, cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0' }, horizontalAlignment: 'RIGHT' } }, fields: 'userEnteredFormat(numberFormat,horizontalAlignment)' } },
    { repeatCell: { range: { sheetId: sid, startRowIndex: 3, endRowIndex: T, startColumnIndex: 6, endColumnIndex: 7 }, cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0' }, horizontalAlignment: 'RIGHT' } }, fields: 'userEnteredFormat(numberFormat,horizontalAlignment)' } },
  ];
  [35,100,120,220,120,140,120,100].forEach((w,i) => rq.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'COLUMNS', startIndex: i, endIndex: i+1 }, properties: { pixelSize: w }, fields: 'pixelSize' } }));
  rq.push(fmt(sid, T-1, T, 0, 8, {red:.06,green:.12,blue:.25}, {red:1,green:1,blue:1}, true, 11, 'CENTER'));
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: SID, requestBody: { requests: rq } });
}

// ==================== OYLIK ISH HAQI ====================
async function syncMonthlySalary(sheets: any, staff: any[], salaryExp: any[], existing: string[]) {
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthKeys = new Set<string>([currentKey]);
  for (const e of salaryExp) { const d = e.date?.split('T')?.[0]||''; if (d) { const [y,m] = d.split('-'); monthKeys.add(`${y}-${m}`); } }

  for (const mk of Array.from(monthKeys).sort()) {
    const [yr,mo] = mk.split('-');
    const mIdx = parseInt(mo)-1;
    const name = `${MONTHS[mIdx]} ${yr}`;
    const isCurrent = mk === currentKey;
    if (!isCurrent && existing.includes(name)) continue;

    await ensureSheet(sheets, name, existing);
    await cleanSheet(sheets, name, 11);

    const mExp = salaryExp.filter((e:any) => (e.date?.split('T')?.[0]||'').startsWith(mk));
    const sp2: Record<string,any[]> = {};
    for (const m of staff) sp2[m.fullName||m.full_name||''] = [];
    for (const e of mExp) { const n = e.title?.split(' - ')?.[1]?.trim()||''; if (sp2[n]) sp2[n].push({ date: e.date?.split('T')?.[0]||'', type: e.title?.toLowerCase()?.includes('avans')?'Avans':'Oylik', amount: Number(e.amount||0), comment: e.comment||'' }); }

    let gA=0,gO=0,gS=0;
    for (const m of staff) { const n=m.fullName||m.full_name||''; const p=sp2[n]||[]; gA+=p.filter((x:any)=>x.type==='Avans').reduce((s:number,x:any)=>s+x.amount,0); gO+=p.filter((x:any)=>x.type==='Oylik').reduce((s:number,x:any)=>s+x.amount,0); gS+=Number(m.salary||0); }

    const syncTime = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const C = 11;
    const rows: any[][] = [];
    const types: string[] = [];

    rows.push([`ISH HAQI VA AVANSLAR — ${MONTHS[mIdx]} ${yr}`, ...Array(C-1).fill('')]); types.push('title');
    rows.push([`${syncTime} · ${staff.length} xodim · Fond: ${gS.toLocaleString()} · Berilgan: ${(gA+gO).toLocaleString()} · Qoldiq: ${(gS-gA-gO).toLocaleString()}`, ...Array(C-1).fill('')]); types.push('info');
    rows.push(Array(C).fill('')); types.push('empty');
    rows.push(['№','Sana','F.I.O','Lavozimi','Telefon','Ish rejimi',"To'lov turi","Summa (so'm)",'Izoh','Jami berilgan',"Qoldiq (so'm)"]); types.push('header');
    const hIdx = rows.length-1;
    let eN=0, tP=0;

    for (const m of staff) {
      const n=m.fullName||m.full_name||'', r=ROLES[m.role]||m.role||'', ph=m.phone||'', sc=m.workSchedule||m.work_schedule||'6/1', sal=Number(m.salary||0);
      const p=(sp2[n]||[]).sort((a:any,b:any)=>a.date.localeCompare(b.date));
      const mA=p.filter((x:any)=>x.type==='Avans').reduce((s:number,x:any)=>s+x.amount,0);
      const mO=p.filter((x:any)=>x.type==='Oylik').reduce((s:number,x:any)=>s+x.amount,0);
      const tp=mA+mO, rem=sal-tp; eN++;
      if (p.length===0) { rows.push([eN,'—',n,r,ph,sc,'—',sal,"To'lov kutilmoqda",0,rem]); types.push('employee'); }
      else { rows.push([eN,p[0].date,n,r,ph,sc,p[0].type,p[0].amount,p[0].comment,tp,rem]); types.push('employee'); tP++;
        for (let i=1;i<p.length;i++) { rows.push(['',p[i].date,'','','','',p[i].type,p[i].amount,p[i].comment,'','']); types.push('payment'); tP++; }
      }
    }
    rows.push(['','','JAMI','',`${eN} xodim`,'',`${tP} to'lov`,gA+gO,`Avans:${gA.toLocaleString()}|Oylik:${gO.toLocaleString()}`,gA+gO,gS-gA-gO]); types.push('total');
    rows.push(Array(C).fill('')); types.push('empty');
    rows.push(['','','Buxgalter: _______________','','','','Direktor: _______________','','','Sana: ___/___/______','']); types.push('sig');

    await sheets.spreadsheets.values.update({ spreadsheetId: SID, range: `'${name}'!A1`, valueInputOption: 'USER_ENTERED', requestBody: { values: rows } });

    const sp = await sheets.spreadsheets.get({ spreadsheetId: SID });
    const sid = sp.data.sheets?.find((s:any)=>s.properties?.title===name)?.properties?.sheetId;
    if (sid===undefined) continue;
    const T=rows.length;
    const rq: any[] = [
      { mergeCells: { range: { sheetId:sid, startRowIndex:0, endRowIndex:1, startColumnIndex:0, endColumnIndex:C }, mergeType:'MERGE_ALL' } },
      fmt(sid,0,1,0,C,{red:.06,green:.12,blue:.25},{red:1,green:1,blue:1},true,14,'CENTER'),
      { updateDimensionProperties: { range: { sheetId:sid, dimension:'ROWS', startIndex:0, endIndex:1 }, properties: { pixelSize:48 }, fields:'pixelSize' } },
      { mergeCells: { range: { sheetId:sid, startRowIndex:1, endRowIndex:2, startColumnIndex:0, endColumnIndex:C }, mergeType:'MERGE_ALL' } },
      fmt(sid,1,2,0,C,{red:.1,green:.18,blue:.35},{red:.7,green:.82,blue:.95},false,9,'CENTER'),
      fmt(sid,hIdx,hIdx+1,0,C,{red:.14,green:.45,blue:.22},{red:1,green:1,blue:1},true,10,'CENTER'),
      { updateDimensionProperties: { range: { sheetId:sid, dimension:'ROWS', startIndex:hIdx, endIndex:hIdx+1 }, properties: { pixelSize:34 }, fields:'pixelSize' } },
    ];
    for (let i=hIdx+1;i<T;i++) {
      const rt=types[i];
      if (rt==='employee') rq.push(fmt(sid,i,i+1,0,C,{red:.93,green:.95,blue:1},{red:.1,green:.1,blue:.15},true,10));
      else if (rt==='payment') rq.push(fmt(sid,i,i+1,0,C,{red:.98,green:.98,blue:.99},{red:.4,green:.4,blue:.45},false,9));
      else if (rt==='total') rq.push(fmt(sid,i,i+1,0,C,{red:.06,green:.12,blue:.25},{red:1,green:1,blue:1},true,11,'CENTER'));
    }
    // Conditional: Avans=ko'k, Oylik=yashil
    rq.push({ addConditionalFormatRule: { rule: { ranges: [{ sheetId:sid, startRowIndex:hIdx+1, endRowIndex:T, startColumnIndex:6, endColumnIndex:7 }], booleanRule: { condition: { type:'TEXT_EQ', values:[{userEnteredValue:'Avans'}] }, format: { backgroundColor:{red:.87,green:.92,blue:1}, textFormat:{foregroundColor:{red:.12,green:.32,blue:.68},bold:true} } } }, index:0 } });
    rq.push({ addConditionalFormatRule: { rule: { ranges: [{ sheetId:sid, startRowIndex:hIdx+1, endRowIndex:T, startColumnIndex:6, endColumnIndex:7 }], booleanRule: { condition: { type:'TEXT_EQ', values:[{userEnteredValue:'Oylik'}] }, format: { backgroundColor:{red:.84,green:.96,blue:.84}, textFormat:{foregroundColor:{red:.08,green:.48,blue:.16},bold:true} } } }, index:1 } });
    // Qoldiq rang
    rq.push({ addConditionalFormatRule: { rule: { ranges: [{ sheetId:sid, startRowIndex:hIdx+1, endRowIndex:T-2, startColumnIndex:10, endColumnIndex:11 }], booleanRule: { condition: { type:'NUMBER_GREATER', values:[{userEnteredValue:'0'}] }, format: { backgroundColor:{red:.87,green:1,blue:.87}, textFormat:{foregroundColor:{red:.06,green:.46,blue:.12},bold:true} } } }, index:2 } });
    rq.push({ addConditionalFormatRule: { rule: { ranges: [{ sheetId:sid, startRowIndex:hIdx+1, endRowIndex:T-2, startColumnIndex:10, endColumnIndex:11 }], booleanRule: { condition: { type:'NUMBER_LESS', values:[{userEnteredValue:'0'}] }, format: { backgroundColor:{red:1,green:.87,blue:.87}, textFormat:{foregroundColor:{red:.78,green:.08,blue:.08},bold:true} } } }, index:3 } });
    // Number format
    rq.push({ repeatCell: { range: { sheetId:sid, startRowIndex:hIdx+1, endRowIndex:T, startColumnIndex:7, endColumnIndex:8 }, cell: { userEnteredFormat: { numberFormat:{type:'NUMBER',pattern:'#,##0'}, horizontalAlignment:'RIGHT' } }, fields:'userEnteredFormat(numberFormat,horizontalAlignment)' } });
    rq.push({ repeatCell: { range: { sheetId:sid, startRowIndex:hIdx+1, endRowIndex:T, startColumnIndex:9, endColumnIndex:11 }, cell: { userEnteredFormat: { numberFormat:{type:'NUMBER',pattern:'#,##0'}, horizontalAlignment:'RIGHT' } }, fields:'userEnteredFormat(numberFormat,horizontalAlignment)' } });
    [35,95,180,120,125,75,90,120,200,115,120].forEach((w,i) => rq.push({ updateDimensionProperties: { range: { sheetId:sid, dimension:'COLUMNS', startIndex:i, endIndex:i+1 }, properties: { pixelSize:w }, fields:'pixelSize' } }));
    rq.push({ updateSheetProperties: { properties: { sheetId:sid, gridProperties: { frozenRowCount:hIdx+1 } }, fields:'gridProperties.frozenRowCount' } });
    rq.push({ setBasicFilter: { filter: { range: { sheetId:sid, startRowIndex:hIdx, startColumnIndex:0, endColumnIndex:C, endRowIndex:T-2 } } } });
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: SID, requestBody: { requests: rq } });
  }
}

// ==================== ESKI VARAQLARNI TOZALASH ====================
async function deleteOldSheets(sheets: any, existing: string[]) {
  const toDelete = ['Лист1', 'Baza', 'Ish haqi va Avanslar'];
  const sp = await sheets.spreadsheets.get({ spreadsheetId: SID });
  const allSheets = sp.data.sheets || [];
  if (allSheets.length <= toDelete.length) return; // Kamida 1 ta varaq qolishi kerak
  const rq: any[] = [];
  for (const s of allSheets) {
    if (toDelete.includes(s.properties?.title || '') && allSheets.length - rq.length > 1) {
      rq.push({ deleteSheet: { sheetId: s.properties?.sheetId } });
    }
  }
  if (rq.length > 0) await sheets.spreadsheets.batchUpdate({ spreadsheetId: SID, requestBody: { requests: rq } });
}

// ==================== MAIN ====================
export async function POST(req: Request) {
  try {
    const { staff, expenses, customers } = await req.json();
    if (!staff || !Array.isArray(staff)) return NextResponse.json({ success: false, error: "Xodimlar topilmadi" }, { status: 400 });

    const sheets = await getSheets();
    const sp = await sheets.spreadsheets.get({ spreadsheetId: SID });
    const existing = (sp.data.sheets || []).map((s:any) => s.properties?.title || '');

    const salaryExp = (expenses||[]).filter((e:any) => e.category === 'Ish haqi' && (e.title?.includes('Avans') || e.title?.includes('Oylik')));

    // 1. Mijozlar
    if (customers && Array.isArray(customers) && customers.length > 0) {
      await syncCustomers(sheets, customers, existing);
    }
    // 2. Moliyaviy hisobot
    if (expenses && expenses.length > 0) {
      await syncFinance(sheets, expenses, existing);
    }
    // 3. Oylik ish haqi
    await syncMonthlySalary(sheets, staff, salaryExp, existing);
    // 4. Eski varaqlarni tozalash
    await deleteOldSheets(sheets, existing);

    return NextResponse.json({ success: true, message: `Sinxronlashtirildi: ${staff.length} xodim, ${(customers||[]).length} mijoz, ${(expenses||[]).length} xarajat` });
  } catch (error: any) {
    console.error('Sync xatolik:', error?.message || error);
    return NextResponse.json({ success: false, error: error?.message || "Xatolik" }, { status: 500 });
  }
}
