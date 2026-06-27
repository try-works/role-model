import { RegistryServer } from './server';

const PORT = parseInt(process.env.REGISTRY_PORT || '3001', 10);

async function main() {
  const server = new RegistryServer(PORT);
  await server.start();

  process.on('SIGINT', async () => {
    console.log('\n[Registry] Shutting down...');
    await server.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
