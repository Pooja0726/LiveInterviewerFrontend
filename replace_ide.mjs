import fs from 'fs';
const path = 'p:/frontend/src/pages/LiveInterviewPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// Normalize CRLF to LF for easier replacement
content = content.replace(/\r\n/g, '\n');

const targetTextarea = `<textarea 
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  spellCheck="false"
                  style={{ 
                    flex: 1, background: '#1E1E1E', color: '#D4D4D4', border: 'none', padding: '1rem', 
                    fontFamily: 'monospace', fontSize: '14px', outline: 'none', resize: 'none', lineHeight: 1.5 
                  }}
                  placeholder={\`// Write your \${codeLang === 'cpp' ? 'C++' : codeLang === 'python' ? 'Python' : codeLang === 'java' ? 'Java' : 'JavaScript'} code here...\\n// The AI interviewer can see everything you write.\`}
                />`;

const replacementTextarea = `<div style={{ flex: 2, position: 'relative' }}>
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
                </div>`;

const targetButton = `onClick={() => sendAnswer("I have submitted my code.", inputCode)}`;
const replacementButton = `onClick={executeCode} disabled={isExecuting}`;

const targetRunText = `>Run & Submit</button>`;
const replacementRunText = `>{isExecuting ? 'Running...' : 'Run & Submit'}</button>`;

const targetFooter = `                  <span>LIVEinterVIEWer IDE</span>
                  <span>Ln {inputCode.split('\\n').length}, Col {inputCode.length - inputCode.lastIndexOf('\\n')}</span>`;
const replacementFooter = `                  <span>LIVEinterVIEWer IDE with Monaco</span>
                  <span>Ready</span>`;

content = content.replace(targetTextarea, replacementTextarea);
content = content.replace(targetButton, replacementButton);
content = content.replace(targetRunText, replacementRunText);
content = content.replace(targetFooter, replacementFooter);

// Convert back to CRLF
content = content.replace(/\n/g, '\r\n');

fs.writeFileSync(path, content, 'utf8');
console.log('Done!');
