const fs = require('fs');
const path = require('path');
const historyDir = path.join(process.env.APPDATA, 'Code', 'User', 'History');
const folders = fs.readdirSync(historyDir);

if (fs.existsSync('resources.txt')) fs.unlinkSync('resources.txt');

for (const folder of folders) {
  const folderPath = path.join(historyDir, folder);
  if (fs.statSync(folderPath).isDirectory()) {
    try {
      const entriesPath = path.join(folderPath, 'entries.json');
      if (fs.existsSync(entriesPath)) {
        const data = JSON.parse(fs.readFileSync(entriesPath, 'utf8'));
        if (data.resource) {
          fs.appendFileSync('resources.txt', data.resource + '\n');
        }
      }
    } catch (e) {
    }
  }
}
