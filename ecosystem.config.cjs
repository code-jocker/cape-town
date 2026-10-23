/**
 * PM2 process config for bare-metal / VM deployments (no Docker).
 *
 * IMPORTANT: run a single instance in fork mode. The app uses Socket.IO with the
 * default in-memory adapter, so multiple cluster workers would each hold a
 * separate set of sockets and real-time events would be dropped for clients
 * connected to a different worker. To scale horizontally, first add the
 * @socket.io/redis-adapter and a Redis server, then raise `instances`.
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 save && pm2 startup
 *
 * (.cjs extension because package.json sets "type": "module"; PM2 reads this
 * file as CommonJS.)
 */
module.exports = {
  apps: [
    {
      name: 'elite-paradize',
      script: 'server/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      kill_timeout: 8000, // allow graceful SIGTERM shutdown (server.close + db disconnect)
      env_production: {
        NODE_ENV: 'production'
      },
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      merge_logs: true,
      time: true
    }
  ]
};
