/*
  File: scripts/setupPineconeIndex.js
  Purpose: Check Pinecone index status and provide CLI instructions
  Usage: node scripts/setupPineconeIndex.js
  
  CHANGES (2025-12-07 - Best Practices):
  - Following AGENTS.md: Use CLI for index creation, not SDK
  - This script now checks index status and provides CLI instructions
*/

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pinecone } = require('@pinecone-database/pinecone');

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'articles-index';
const EMBEDDING_DIMENSION = 384; // all-MiniLM-L6-v2 model

async function checkIndexStatus() {
  if (!PINECONE_API_KEY) {
    console.error('❌ PINECONE_API_KEY not found in .env file');
    console.error('Please add: PINECONE_API_KEY=your-api-key');
    process.exit(1);
  }

  try {
    const pinecone = new Pinecone({
      apiKey: PINECONE_API_KEY
    });

    // Check if index exists (using SDK for status check only - best practice)
    const indexes = await pinecone.listIndexes();
    const indexExists = indexes.indexes?.some(idx => idx.name === PINECONE_INDEX_NAME);

    if (indexExists) {
      console.log(`✅ Index "${PINECONE_INDEX_NAME}" already exists`);
      console.log(`\n📝 Next steps:`);
      console.log(`1. Run: node scripts/generateArticleEmbeddings.js --limit 100`);
      console.log(`2. Embeddings will be automatically synced to Pinecone`);
      return;
    }

    // Index doesn't exist - provide CLI instructions (best practice from AGENTS.md)
    console.log(`❌ Index "${PINECONE_INDEX_NAME}" not found`);
    console.log(`\n📋 To create the index, use Pinecone CLI (best practice):\n`);
    console.log(`1. Install Pinecone CLI:`);
    console.log(`   macOS: brew tap pinecone-io/tap && brew install pinecone-io/tap/pinecone`);
    console.log(`   Other: https://github.com/pinecone-io/cli/releases\n`);
    console.log(`2. Authenticate:`);
    console.log(`   export PINECONE_API_KEY="${PINECONE_API_KEY}"`);
    console.log(`   # Or: pc auth configure --api-key $PINECONE_API_KEY\n`);
    console.log(`3. Create index:`);
    console.log(`   pc index create-serverless \\`);
    console.log(`     --name ${PINECONE_INDEX_NAME} \\`);
    console.log(`     --dimension ${EMBEDDING_DIMENSION} \\`);
    console.log(`     --metric cosine \\`);
    console.log(`     --cloud aws \\`);
    console.log(`     --region us-east-1\n`);
    console.log(`4. Wait for index to be ready (check status):`);
    console.log(`   pc index describe --name ${PINECONE_INDEX_NAME}\n`);
    console.log(`5. Then run: node scripts/generateArticleEmbeddings.js --limit 100`);

  } catch (error) {
    console.error('❌ Failed to check Pinecone index:', error.message);
    console.error('\n💡 Make sure PINECONE_API_KEY is correct and you have access to Pinecone');
    process.exit(1);
  }
}

if (require.main === module) {
  checkIndexStatus().catch(console.error);
}

module.exports = { checkIndexStatus };

