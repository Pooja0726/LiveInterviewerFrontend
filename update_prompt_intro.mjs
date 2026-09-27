import fs from 'fs';
const path = 'p:/frontend/src/pages/SetupInterviewPage.jsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = "      const enrichedRole = `${role} ||| PROMPT_INSTRUCTION: Focus=${focus}. Ask ONLY ${focus} Qs. VERY BRIEF responses! DO NOT point out mistakes in detail. Save feedback for report. Randomize opening!`;";
const replacementStr = "      const enrichedRole = `${role} ||| PROMPT_INSTRUCTION: Focus=${focus}. Ask ONLY ${focus} Qs. VERY BRIEF responses! DO NOT point out mistakes in detail. Save feedback for report. ALWAYS start by asking for an introduction!`;";

content = content.replace(targetStr.replace(/\n/g, '\r\n'), replacementStr.replace(/\n/g, '\r\n'));
content = content.replace(targetStr, replacementStr);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated prompt instruction to include introduction!');
