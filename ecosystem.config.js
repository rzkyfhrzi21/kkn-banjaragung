module.exports = {
  apps: [
    {
      name: 'pekon-banjar-agung',
      script: './server.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000
      }
    }
  ]
};
