module.exports = {
  apps: [
    {
      name: "recycle-api",
      script: "dist/server.js",
      cwd: "/home/recycle/recycle/apps/api",

      instances: "max",
      exec_mode: "cluster",

      autorestart: true,
      watch: false,
      max_memory_restart: "1G",

      env: {
        NODE_ENV: "production",
        PORT: 3001
      }
    }
  ]
}
