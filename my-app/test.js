const fs = require('fs');
let f = fs.readFileSync('src/app/messages/page.jsx', 'utf8');

const oldStr = \        return msgConv || reqConv || prev;
      });\;

const newStr = \        return msgConv || reqConv || prev;
        });
      }\;

if(f.includes(oldStr)) {
  f = f.replace(oldStr, newStr);
  fs.writeFileSync('src/app/messages/page.jsx', f);
  console.log('Fixed syntax');
} else {
  console.log('String not found, checking with regex');
  f = f.replace(/return msgConv \|\| reqConv \|\| prev;\s+\}\);/, 'return msgConv || reqConv || prev;\n        });\n      }');
  fs.writeFileSync('src/app/messages/page.jsx', f);
}

