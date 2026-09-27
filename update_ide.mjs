import fs from 'fs';
const path = 'p:/frontend/src/pages/LiveInterviewPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add STDIN state
if (!content.includes('const [stdin, setStdin]')) {
    content = content.replace(
        "const [executionOutput, setExecutionOutput] = useState('');", 
        "const [executionOutput, setExecutionOutput] = useState('');\n  const [stdin, setStdin] = useState('');"
    );
}

// 2. Prevent inputCode from being cleared
content = content.replace("setInputCode('');\n    resetCaption();", "resetCaption();");
content = content.replace("setInputCode('');\r\n    resetCaption();", "resetCaption();");

// 3. Update execution payload
const oldExec = `body: JSON.stringify({ language: langKey, code: inputCode })`;
const newExec = `body: JSON.stringify({ language: langKey, code: inputCode, stdin: stdin })`;
content = content.replace(oldExec, newExec);

// 4. Update UI to include STDIN text area next to Console Output
const oldConsoleHtml = `<div style={{ flex: 1, background: '#181818', borderTop: '1px solid #404040', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '0.3rem 1rem', background: '#2D2D2D', borderBottom: '1px solid #404040', fontSize: '0.75rem', color: '#A3A3A3', fontWeight: 600, textTransform: 'uppercase' }}>Console Output</div>
                  <pre style={{ margin: 0, padding: '1rem', color: '#E5E5E5', fontFamily: 'monospace', fontSize: '0.85rem', overflowY: 'auto', flex: 1, whiteSpace: 'pre-wrap' }}>
                    {executionOutput || 'Code output will appear here after execution...'}
                  </pre>
                </div>`;

const newConsoleHtml = `<div style={{ flex: 1, display: 'flex', borderTop: '1px solid #404040' }}>
                  <div style={{ flex: 1, background: '#1E1E1E', display: 'flex', flexDirection: 'column', borderRight: '1px solid #404040' }}>
                    <div style={{ padding: '0.3rem 1rem', background: '#2D2D2D', borderBottom: '1px solid #404040', fontSize: '0.75rem', color: '#A3A3A3', fontWeight: 600, textTransform: 'uppercase' }}>Standard Input (stdin)</div>
                    <textarea 
                      value={stdin} 
                      onChange={(e) => setStdin(e.target.value)}
                      placeholder="Enter input for Scanner / cin / input() here..."
                      style={{ margin: 0, padding: '1rem', background: 'transparent', border: 'none', color: '#E5E5E5', fontFamily: 'monospace', fontSize: '0.85rem', flex: 1, resize: 'none', outline: 'none' }}
                    />
                  </div>
                  <div style={{ flex: 1, background: '#181818', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '0.3rem 1rem', background: '#2D2D2D', borderBottom: '1px solid #404040', fontSize: '0.75rem', color: '#A3A3A3', fontWeight: 600, textTransform: 'uppercase' }}>Console Output</div>
                    <pre style={{ margin: 0, padding: '1rem', color: '#E5E5E5', fontFamily: 'monospace', fontSize: '0.85rem', overflowY: 'auto', flex: 1, whiteSpace: 'pre-wrap' }}>
                      {executionOutput || 'Code output will appear here after execution...'}
                    </pre>
                  </div>
                </div>`;

content = content.replace(oldConsoleHtml.replace(/\n/g, '\r\n'), newConsoleHtml.replace(/\n/g, '\r\n'));
content = content.replace(oldConsoleHtml, newConsoleHtml);

fs.writeFileSync(path, content, 'utf8');
console.log('Updated LiveInterviewPage UI successfully!');
