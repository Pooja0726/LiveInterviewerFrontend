import fs from 'fs';
const path = 'p:/frontend/src/pages/LiveInterviewPage.jsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `               <h2 style={{ 
                 fontSize: '1.6rem', fontWeight: 600, lineHeight: 1.4, margin: '0 0 2rem 0',
                 display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden'
               }}>`;

const replacementStr = `               <h2 style={{ 
                 fontSize: '1.25rem', fontWeight: 500, lineHeight: 1.5, margin: '0 0 2rem 0', color: '#E5E5E5'
               }}>`;

content = content.replace(targetStr.replace(/\n/g, '\r\n'), replacementStr.replace(/\n/g, '\r\n'));
content = content.replace(targetStr, replacementStr); // fallback for LF

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated font size and removed clamp!');
