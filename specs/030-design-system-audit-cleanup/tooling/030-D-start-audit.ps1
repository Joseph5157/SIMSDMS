$ErrorActionPreference = 'Stop'

# Dedicated disposable 030-D database. Environment values set here override
# repository .env files without modifying application configuration.
$env:DATABASE_URL = 'postgresql://postgres@127.0.0.1:55432/sims_dms_audit_030'
$env:JWT_SECRET = '030-D-local-audit-only-jwt-secret-not-for-deployment'
$env:JWT_EXPIRES_IN = '1d'
$env:NODE_ENV = 'development'
$env:PORT = '3000'
$env:CORS_ORIGIN = 'http://localhost:5173'
$env:APP_URL = ''
$env:TELEGRAM_BOT_TOKEN = ''
$env:TELEGRAM_BOT_USERNAME = ''
$env:TELEGRAM_WEBHOOK_SECRET = ''

& npm.cmd run dev
exit $LASTEXITCODE
