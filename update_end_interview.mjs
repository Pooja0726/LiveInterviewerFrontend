import fs from 'fs';
const path = 'p:/frontend/src/pages/LiveInterviewPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Change 45 to 30 mins
content = content.replace(/useState\(45 \* 60\)/g, 'useState(30 * 60)');
content = content.replace(/45 \* 60 - timeLeft/g, '30 * 60 - timeLeft');

// 2. Change timer end logic
const timerEndOld = `if (!interviewEnded) {
              alert("Time's up! The interview is ending.");
              if (wsRef.current) wsRef.current.close();
              navigate('/dashboard');
            }`;
const timerEndNew = `if (!interviewEnded) {
              alert("Time's up! Generating your report.");
              if (wsRef.current) wsRef.current.send(JSON.stringify({ type: 'end_interview' }));
            }`;
content = content.replace(timerEndOld.replace(/\n/g, '\r\n'), timerEndNew.replace(/\n/g, '\r\n'));
content = content.replace(timerEndOld, timerEndNew);

// 3. Change "End Interview" button logic
const btnEndOld = `onClick={() => { if(window.confirm('End interview?')) { if(wsRef.current) wsRef.current.close(); navigate('/dashboard'); } }}`;
const btnEndNew = `onClick={() => { if(window.confirm('End interview and generate report?')) { if(wsRef.current) wsRef.current.send(JSON.stringify({ type: 'end_interview' })); setAvatarState('idle'); } }}`;
content = content.replace(btnEndOld, btnEndNew);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated LiveInterviewPage timer and end logic!');
