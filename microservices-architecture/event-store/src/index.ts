import { EventStoreServer } from './server';

const PORT = parseInt(process.env.EVENT_STORE_PORT || '3002', 10);

async function main() {
  const server = new EventStoreServer(PORT);
  await server.start();

  process.on('SIGINT', async () => {
    console.log('\n[EventStore] Shutting down...');
    await server.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
