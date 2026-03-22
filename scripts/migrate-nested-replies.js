const mongoose = require('mongoose');
const path = require('path');

// Change to my-app directory and load env
require('dotenv').config({ path: path.join(__dirname, '../my-app/.env') });

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    const mongoUrl = process.env.MONGODB_URL;

    if (!mongoUrl) {
      throw new Error('MONGODB_URL not found in environment variables');
    }

    await mongoose.connect(mongoUrl);
    console.log('Connected successfully!');

    console.log('\nAdding nested reply fields to existing data...\n');

    // Update Posts - add new fields to all replies
    console.log('Updating Posts...');
    const postsResult = await mongoose.connection.db.collection('posts').updateMany(
      { "comments.replies": { $exists: true, $ne: [] } },
      {
        $set: {
          "comments.$[].replies.$[].parentReplyId": null,
          "comments.$[].replies.$[].depth": 0,
          "comments.$[].replies.$[].mentionedUsers": []
        }
      }
    );

    console.log(`✓ Updated ${postsResult.modifiedCount} posts with replies`);

    // Update Reviews - add new fields to all replies
    console.log('Updating Reviews...');
    const reviewsResult = await mongoose.connection.db.collection('reviews').updateMany(
      { "replies": { $exists: true, $ne: [] } },
      {
        $set: {
          "replies.$[].parentReplyId": null,
          "replies.$[].depth": 0,
          "replies.$[].mentionedUsers": []
        }
      }
    );

    console.log(`✓ Updated ${reviewsResult.modifiedCount} reviews with replies`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\nSummary:');
    console.log(`- Posts modified: ${postsResult.modifiedCount}`);
    console.log(`- Reviews modified: ${reviewsResult.modifiedCount}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run migration
console.log('===========================================');
console.log('  Nested Replies Migration Script');
console.log('===========================================\n');
console.log('This script will add the following fields to all existing replies:');
console.log('- parentReplyId (null for top-level replies)');
console.log('- depth (0 for existing replies)');
console.log('- mentionedUsers (empty array)\n');

migrate().catch(console.error);
