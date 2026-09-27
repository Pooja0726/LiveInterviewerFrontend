import fs from 'fs';
const path = 'p:/frontend/src/pages/LiveInterviewPage.jsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `      const langKey = codeLang === 'cpp' ? 'c++' : (codeLang === 'java' ? 'java' : (codeLang === 'python' ? 'python' : 'javascript'));
      const versionMap = { 'python': '3.10.0', 'cpp': '10.2.0', 'java': '15.0.2', 'javascript': '18.15.0' };
      const res = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: langKey, version: versionMap[codeLang] || '*', files: [{ content: inputCode }] })
      });
      const data = await res.json();
      setExecutionOutput((data.run && data.run.output) ? data.run.output : (data.message || 'Execution failed.'));`;

const replacementStr = `      const langKey = codeLang === 'cpp' ? 'c++' : (codeLang === 'java' ? 'java' : (codeLang === 'python' ? 'python' : 'javascript'));
      const res = await fetch('/api/local-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: langKey, code: inputCode })
      });
      const data = await res.json();
      setExecutionOutput(data.output || data.error || 'Execution failed.');`;

// Normalize string endings just in case
content = content.replace(targetStr.replace(/\n/g, '\r\n'), replacementStr.replace(/\n/g, '\r\n'));
content = content.replace(targetStr, replacementStr); // fallback if it was already \n

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated execution endpoint!');
