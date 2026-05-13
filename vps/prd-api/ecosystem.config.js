module.exports = {
  apps: [{
    name:       'prd-api',
    script:     'server.js',
    watch:      false,
    autorestart: true,
    max_memory_restart: '400M',
    env: {
      NODE_ENV: 'production',
    },
    error_file: 'logs/error.log',
    out_file:   'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }],
}
