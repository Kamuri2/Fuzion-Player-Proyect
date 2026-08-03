const fs = require('fs');
const lines = fs.readFileSync('C:/Users/kevin/.gemini/antigravity-ide/brain/5d6735a3-9f1a-4b66-b820-38e19eb9c7d0/.system_generated/logs/transcript.jsonl', 'utf8').split('\n');
const editedFiles = new Set();
const viewedFiles = new Set();
for (const l of lines) {
  if (!l) continue;
  try {
    const d = JSON.parse(l);
    if (d.type === 'PLANNER_RESPONSE' && d.tool_calls) {
      for (const t of d.tool_calls) {
        if (t.name === 'view_file') {
          viewedFiles.add(t.args.AbsolutePath);
        }
        if (t.name === 'replace_file_content' || t.name === 'multi_replace_file_content') {
          editedFiles.add(t.args.TargetFile);
        }
      }
    }
  } catch(e){}
}
console.log('EDITED FILES:');
console.log(Array.from(editedFiles).join('\n'));
console.log('\nVIEWED FILES:');
console.log(Array.from(viewedFiles).join('\n'));
