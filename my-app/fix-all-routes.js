import fs from 'fs';
import path from 'path';

// Routes that definitely need DB connection
const routesNeedingDB = [
  './ai-assistant/route.js',
  './ai-assistant/suggestions/route.js',
  './leaderboard/route.js',
  './moderate/route.js',
  './recommendations/all/route.js',
  './reviews/route.js',
  './reviews/user/[userId]/route.js',
  './reviews/[reviewId]/dislike/route.js',
  './reviews/[reviewId]/like/route.js',
  './reviews/[reviewId]/reply/route.js',
  './reviews/[reviewId]/reply/[replyId]/dislike/route.js',
  './reviews/[reviewId]/reply/[replyId]/like/route.js',
  './reviews/[reviewId]/route.js',
  './search/log/route.js',
  './spoiler-detect/route.js',
  './users/leaderboard/route.js',
  './users/me/favorites/route.js',
  './users/me/favorites/[id]/route.js',
  './users/me/route.js',
  './users/me/stats/route.js',
  './users/me/watchlist/route.js',
  './users/me/watchlist/[id]/route.js',
  './users/profile/route.js',
];

routesNeedingDB.forEach((file) => {
  const filePath = path.join(process.cwd(), 'src', 'app', 'api', file);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ Not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has connectDB import
  if (content.includes('connectDB')) {
    console.log(`✅ Already has connectDB: ${file}`);
    return;
  }

  // Add import - find last import line
  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') && lines[i].includes('from')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, "import connectDB from '@/lib/config/database.js'");
  } else {
    // No imports found, add at the top
    lines.unshift("import connectDB from '@/lib/config/database.js'");
  }

  content = lines.join('\n');

  // Find export function and add await connectDB() call
  const handlers = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  let modified = false;

  handlers.forEach(method => {
    // Handle: export async function GET(
    const funcRegex = new RegExp(`(export async function ${method}\\s*\\([^)]*\\)\\s*\\{\\s*)`, 'g');
    if (content.match(funcRegex)) {
      content = content.replace(funcRegex, `$1\n  await connectDB()\n`);
      modified = true;
    }

    // Handle: export const GET = async (...) => {
    const arrowRegex = new RegExp(`(export const ${method} = async \\([^)]*\\) => \\{\\s*)`, 'g');
    if (content.match(arrowRegex)) {
      content = content.replace(arrowRegex, `$1\n  await connectDB()\n`);
      modified = true;
    }

    // Handle: export const GET = withAuth(async (...) => {
    const withAuthRegex = new RegExp(`(export const ${method} = with(?:Auth|OptionalAuth)\\(async \\([^)]*\\) => \\{\\s*)`, 'g');
    if (content.match(withAuthRegex)) {
      content = content.replace(withAuthRegex, `$1\n    await connectDB()\n`);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
  } else {
    console.log(`⚠️  Could not modify: ${file}`);
  }
});

console.log('\n✅ Done!');

