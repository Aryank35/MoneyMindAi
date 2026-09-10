// One-off backfill.
//
// `balanceApplied` was added to Obligation after records already existed.
// Mongoose hydrates the missing field as its default (false), so the bank
// statement treated every pre-existing loan as "never moved the money" and
// left it out of the ledger - even though each one had debited the account
// when it was created.
//
// Every obligation written by the earlier code moved the balance whenever an
// account was attached (the opt-out was only reachable from a form that
// always sent it as true on create), so records with an accountId are set to
// true and ones without are set to false.
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ quiet: true });

const run = async () => {
  await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 20000 });

  const collection = mongoose.connection.db.collection("obligations");

  const missing = await collection
    .find({ balanceApplied: { $exists: false } })
    .toArray();

  console.log(`${missing.length} obligation(s) without the field:`);

  for (const item of missing) {
    console.log(
      `  ${item.direction} ${item.counterparty} ${item.principal} -> balanceApplied: ${Boolean(item.accountId)}`,
    );
  }

  if (missing.length === 0) {
    console.log("Nothing to backfill.");
    await mongoose.disconnect();
    return;
  }

  const withAccount = await collection.updateMany(
    { balanceApplied: { $exists: false }, accountId: { $ne: null } },
    { $set: { balanceApplied: true } },
  );

  const withoutAccount = await collection.updateMany(
    { balanceApplied: { $exists: false } },
    { $set: { balanceApplied: false } },
  );

  console.log(
    `\nSet true on ${withAccount.modifiedCount}, false on ${withoutAccount.modifiedCount}.`,
  );

  const remaining = await collection.countDocuments({
    balanceApplied: { $exists: false },
  });

  console.log(`Remaining without the field: ${remaining} (want 0)`);

  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
