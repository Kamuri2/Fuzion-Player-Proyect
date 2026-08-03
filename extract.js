const fs = require('fs');
const logPath = 'C:/Users/kevin/.gemini/antigravity-ide/brain/5d6735a3-9f1a-4b66-b820-38e19eb9c7d0/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(logPath, 'utf8').split('\n');
const fileContents = {};
let xcopySeen = false;

for (const l of lines) {
  if (!l) continue;
  try {
    const d = JSON.parse(l);
    if (d.type === 'PLANNER_RESPONSE' && d.tool_calls) {
      for (const t of d.tool_calls) {
        if (t.name === 'run_command' && t.args.CommandLine && t.args.CommandLine.includes('xcopy')) {
          xcopySeen = true;
        }
        
        if (!xcopySeen && (t.name === 'replace_file_content' || t.name === 'multi_replace_file_content')) {
          // Record that this file was edited before xcopy. We can't get the full content here,
          // but we can at least know it was edited.
        }
      }
    }
  } catch(e) {}
}

console.log("XCOPY SEEN:", xcopySeen);
