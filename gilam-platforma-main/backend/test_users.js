const axios = require('axios');

async function test() {
  try {
    const login = await axios.post('http://localhost:3000/auth/login', {
      phone: '+998970504202',
      password: 'operator_password' // Wait, I don't know the password...
    });
    const token = login.data.access_token;
    
    const users = await axios.get('http://localhost:3000/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(users.data.filter(u => u.role === 'DRIVER').map(u => ({ name: u.fullName, companyId: u.companyId })));
  } catch(e) {
    console.error(e.response?.data || e.message);
  }
}

test();
