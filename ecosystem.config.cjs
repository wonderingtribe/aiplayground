module.exports = {
  apps: [
    {
      name: 'playground-frontend',
      script: 'npx',
      args: 'vite --port=3000 --host=0.0.0.0',
      cwd: __dirname,
      autorestart: true,
      max_restarts: 5,
      min_uptime: 5000,
    },
    {
      name: 'playground-server',
      script: 'node',
      args: '--import tsx/esm server/index.ts',
      cwd: __dirname,
      autorestart: true,
      max_restarts: 5,
      min_uptime: 5000,
    },
  ],
};
