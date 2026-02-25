import { ensureSchema } from '../src/lib/db';

ensureSchema().then(() => {
  console.log('Database initialized.');
  process.exit(0);
});
