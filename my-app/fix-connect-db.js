import fs from 'fs';
import path from 'path';

const files = [
  'src/app/api/auth/refresh/route.js',
  'src/app/api/communities/posts/route.js',
  'src/app/api/communities/recommended/route.js',
  'src/app/api/communities/route.js',
  'src/app/api/communities/search/route.js',
  'src/app/api/communities/[slug]/delete/route.js',
  'src/app/api/communities/[slug]/members/route.js',
  'src/app/api/communities/[slug]/posts/route.js',
  'src/app/api/communities/[slug]/requests/route.js',
  'src/app/api/communities/[slug]/route.js',
  'src/app/api/communities/[slug]/update/route.js',
  'src/app/api/content/[type]/[id]/friends-liked/route.js',
  'src/app/api/notifications/action/route.js',
  'src/app/api/notifications/generate/route.js',
  'src/app/api/notifications/generate-all/route.js',
  'src/app/api/notifications/route.js',
  'src/app/api/posts/[id]/comment/route.js',
  'src/app/api/posts/[id]/comment/[commentId]/reply/route.js',
  'src/app/api/posts/[id]/route.js',
  'src/app/api/users/me/activity/route.js',
  'src/app/api/users/me/follow-requests/route.js',
  'src/app/api/users/me/settings/route.js',
  'src/app/api/users/[id]/follow/route.js',
  'src/app/api/users/[id]/followers/route.js',
  'src/app/api/users/[id]/following/route.js',
];

files.forEach((file) => {
  const filePath = path.join(process.cwd(), file);

  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Check if file has top-level await connectDB()
  if (!content.match(/^await connectDB\(\)/m)) {
    console.log(`Skipping ${file} - no top-level await`);
    return;
  }

  // Remove top-level await connectDB() and the empty line after it
  content = content.replace(/^await connectDB\(\);\?\n\n?/m, '');

  // Find the first export function and add await connectDB() at the start
  // Pattern: export const GET/POST/PUT/DELETE/PATCH =
  const handlerMatch = content.match(/(export const (?:GET|POST|PUT|DELETE|PATCH) = .*?(?:async )?\(.*?\) => \{)/);

  if (handlerMatch) {
    const handler = handlerMatch[0];
    // Check if try block exists right after
    const tryMatch = content.indexOf('try {', content.indexOf(handler));

    if (tryMatch > -1 && tryMatch - content.indexOf(handler) < 100) {
      // Add await connectDB() right after try {
      content = content.replace(
        /(export const (?:GET|POST|PUT|DELETE|PATCH) = .*?(?:async )?\(.*?\) => \{\s*try \{)/,
        '$1\n    await connectDB();'
      );
    } else {
      // Add await connectDB() right after the handler function opening
      content = content.replace(
        /(export const (?:GET|POST|PUT|DELETE|PATCH) = .*?(?:async )?\(.*?\) => \{)/,
        '$1\n  await connectDB();'
      );
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${file}`);
  } else {
    console.log(`Could not find handler in ${file}`);
  }
});

console.log('Done!');
