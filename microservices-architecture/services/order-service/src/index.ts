import { OrderService } from './order-service';

const PORT = parseInt(process.env.ORDER_SERVICE_PORT || '3004', 10);
const REGISTRY_URL = process.env.REGISTRY_URL || 'http://localhost:3001';
const EVENT_STORE_URL = process.env.EVENT_STORE_URL || 'http://localhost:3002';

process.env.EVENT_STORE_URL = EVENT_STORE_URL;

const service = new OrderService({
  name: 'order-service',
  version: '1.0.0',
  port: PORT,
  registryUrl: REGISTRY_URL,
  metadata: {
    description: 'Order management service',
    eventStore: EVENT_STORE_URL,
  },
  ttl: 30,
});

async function main() {
  await service.start();

  process.on('SIGINT', async () => {
    console.log('\n[OrderService] Shutting down...');
    await service.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await service.stop();
    process.exit(0);
  });
}

main().catch(console.error);
