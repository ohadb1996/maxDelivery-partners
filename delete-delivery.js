// Quick script to delete a stuck delivery
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, remove } from 'firebase/database';
import firebaseConfig from './src/api/config/dev/firebaseConfig.json' assert { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const deliveryId = '-OCN3CDE';

console.log(`🗑️ Deleting delivery ${deliveryId}...`);

const deliveryRef = ref(db, `Deliveries/${deliveryId}`);
await remove(deliveryRef);

console.log('✅ Delivery deleted successfully!');
process.exit(0);


