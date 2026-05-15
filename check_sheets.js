const { google } = require('googleapis');
const path = require('path');

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join('/home/ubuntu/projects/gilam/frontend', 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const id = '1k8vMhWoQ9jy4CLl55ipGf7vq2VykAZ3bM_VV5yl8bgc';

  const sp = await sheets.spreadsheets.get({ spreadsheetId: id });
  for (const s of sp.data.sheets) {
    const title = s.properties.title;
    const rows = s.properties.gridProperties.rowCount;
    const cols = s.properties.gridProperties.columnCount;
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: id,
        range: `'${title}'!A1:H5`,
      });
      console.log(`=== ${title} (${rows} rows, ${cols} cols) ===`);
      (res.data.values || []).forEach((r, i) => console.log(`  Row ${i+1}: ${JSON.stringify(r)}`));
    } catch(e) {
      console.log(`=== ${title} === (empty or error)`);
    }
    console.log('');
  }
}
main().catch(console.error);
