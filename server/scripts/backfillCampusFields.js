import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectToDatabase } from '../config/db.js';
import { Item } from '../models/Item.js';

async function run() {
  await connectToDatabase();

  const items = await Item.find({
    $or: [
      { type: 'found', foundLocation: { $in: [null, ''] } },
      { type: 'lost', lastSeenLocation: { $in: [null, ''] } }
    ]
  });

  let updated = 0;

  for (const item of items) {
    if (item.type === 'found') {
      item.foundLocation = 'other';
      item.foundLocationOther = item.location || 'Unknown campus location';
      if (!item.pickupLocation) {
        item.pickupLocation = 'other';
        item.pickupLocationOther = 'Contact poster to arrange pickup';
      }
      if (!item.contactMethod) {
        item.contactMethod = 'email';
      }
    }

    if (item.type === 'lost') {
      item.lastSeenLocation = item.location || 'Unknown campus location';
      if (!item.contactMethod) {
        item.contactMethod = 'email';
      }
    }

    await item.save();
    updated += 1;
  }

  console.log(`Backfill complete. Updated ${updated} item(s).`);
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error('Backfill failed:', error);
  mongoose.disconnect().finally(() => process.exit(1));
});
