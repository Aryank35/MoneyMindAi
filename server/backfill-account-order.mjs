// One-off backfill.
//
// `displayOrder` was added so accounts can be arranged by the user. Existing
// accounts all default to 0, which would leave the order down to whatever
// Mongo returned. This writes the order they were *already* being shown in
// (salary first, then EPF, then oldest first) so nothing appears to move the
// first time the page loads after the change.
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ quiet: true });

const run = async () => {
  await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 20000 });

  const collection = mongoose.connection.db.collection("accounts");

  const users = await collection.distinct("userId");

  let updated = 0;

  for (const userId of users) {
    const accounts = await collection
      .find({ userId })
      .sort({ isSalaryAccount: -1, isEpfAccount: -1, createdAt: 1 })
      .toArray();

    console.log(`\nuser ${userId}: ${accounts.length} account(s)`);

    for (const [index, account] of accounts.entries()) {
      const already = account.displayOrder;

      if (already === index) continue;

      await collection.updateOne(
        { _id: account._id },
        { $set: { displayOrder: index } },
      );

      updated += 1;

      console.log(`  ${index}. ${account.name}`);
    }
  }

  const missing = await collection.countDocuments({
    displayOrder: { $exists: false },
  });

  console.log(`\n${updated} account(s) given an order.`);
  console.log(`Still without the field: ${missing} (want 0)`);

  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
