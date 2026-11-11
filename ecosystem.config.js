module.exports = {
  apps: [
    {
      name: "specforge-production",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      exp_backoff_restart_delay: 100,
    },
  ],
};

