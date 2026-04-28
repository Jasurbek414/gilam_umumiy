module.exports = {
  apps: [{
    name: 'gilam-backend',
    script: 'dist/main.js',
    cwd: 'D:/gilam/gilam-platforma-main/backend',
    env: {
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USER: 'postgres',
      DB_PASSWORD: 'postgres',
      DB_NAME: 'gilam_saas',
      JWT_SECRET: 'gilam-saas-jwt-secret-key-2026',
      FIREBASE_SERVICE_ACCOUNT_PATH: 'D:/gilam/gilam-platforma-main/backend/firebase-service-account.json',
      NODE_ENV: 'production',
      PORT: '5555'
    }
  }]
};
