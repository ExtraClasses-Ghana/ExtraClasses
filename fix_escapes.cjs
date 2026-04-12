const fs = require('fs');
const files = ['src/pages/admin/AdminTeachers.tsx', 'src/pages/admin/AdminVerification.tsx'];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/\\\`/g, '`').replace(/\\\$/g, '$');
  fs.writeFileSync(f, content);
});
