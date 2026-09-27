import fs from 'fs';
const path = 'p:/frontend/src/pages/LiveInterviewPage.jsx';
let content = fs.readFileSync(path, 'utf8');

const startText = '<textarea';
const startIndex = content.indexOf(startText, content.indexOf('Run & Submit'));
const middleText = "Col {inputCode.length - inputCode.lastIndexOf('\\n')}</span>";
const middleIndex = content.indexOf(middleText, startIndex);
const endIndex = content.indexOf('</div>', middleIndex) + 6;

if (startIndex === -1 || middleIndex === -1 || endIndex === 5) {
    console.log('Failed to find indices!', startIndex, middleIndex, endIndex);
    process.exit(1);
}

const replacement = `<div style={{ flex: 2, position: 'relative' }}>
                  <Editor
                    height="100%"
                    language={codeLang === 'cpp' ? 'cpp' : codeLang}
                    theme="vs-dark"
                    value={inputCode}
                    onChange={(value) => setInputCode(value || '')}
                    options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on' }}
                  />
                </div>
                <div style={{ flex: 1, background: '#181818', borderTop: '1px solid #404040', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '0.3rem 1rem', background: '#2D2D2D', borderBottom: '1px solid #404040', fontSize: '0.75rem', color: '#A3A3A3', fontWeight: 600, textTransform: 'uppercase' }}>Console Output</div>
                  <pre style={{ margin: 0, padding: '1rem', color: '#E5E5E5', fontFamily: 'monospace', fontSize: '0.85rem', overflowY: 'auto', flex: 1, whiteSpace: 'pre-wrap' }}>
                    {executionOutput || 'Code output will appear here after execution...'}
                  </pre>
                </div>
                <div style={{ padding: '0.4rem 1rem', background: '#007ACC', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                  <span>LIVEinterVIEWer IDE with Monaco</span>
                  <span>Ready</span>
                </div>`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully injected Editor!');
