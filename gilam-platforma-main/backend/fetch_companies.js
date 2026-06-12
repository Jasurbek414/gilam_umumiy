const https = require('https');

https.get('https://gilam-api.ecos.uz/api/public/companies', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const companies = JSON.parse(data);
      console.log('--- REMOTE COMPANIES ---');
      console.log(JSON.stringify(companies, null, 2));
    } catch (e) {
      console.log('Error parsing JSON:', e.message);
      console.log('Raw data:', data);
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
