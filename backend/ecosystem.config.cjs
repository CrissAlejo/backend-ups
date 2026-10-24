module.exports = {
  apps: [
    {
      name: "backend-ups",
      script: "./dist/index.js",

      instances: 1,
      exec_mode: "fork",

      autorestart: true,
      watch: false,

      max_memory_restart: "500M",

      env_production: {
        NODE_ENV: "production",
        PORT: 3000
      },

      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true
    }
  ]
};
