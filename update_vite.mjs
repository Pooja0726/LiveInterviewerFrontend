import fs from 'fs';
const path = 'p:/frontend/vite.config.js';

const newViteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

function codeExecutorPlugin() {
  return {
    name: 'code-executor',
    configureServer(server) {
      server.middlewares.use('/api/local-execute', (req, res) => {
        if (req.method !== 'POST') return;
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
          try {
            const { language, code, stdin } = JSON.parse(body);
            const tmpDir = path.join(process.cwd(), '.temp');
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
            
            const timestamp = Date.now();
            let fileName = '';
            let runCmd = '';
            let dir = tmpDir;
            
            const inputPath = path.join(tmpDir, \`input_\${timestamp}.txt\`);
            fs.writeFileSync(inputPath, stdin || '');

            if (language === 'python') {
              fileName = \`main_\${timestamp}.py\`;
              fs.writeFileSync(path.join(tmpDir, fileName), code);
              runCmd = \`python "\${path.join(tmpDir, fileName)}" < "\${inputPath}"\`;
            } else if (language === 'javascript' || language === 'node') {
              fileName = \`main_\${timestamp}.js\`;
              fs.writeFileSync(path.join(tmpDir, fileName), code);
              runCmd = \`node "\${path.join(tmpDir, fileName)}" < "\${inputPath}"\`;
            } else if (language === 'java') {
              fileName = 'Main.java';
              dir = path.join(tmpDir, \`java_\${timestamp}\`);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir);
              fs.writeFileSync(path.join(dir, fileName), code);
              runCmd = \`javac "\${path.join(dir, fileName)}" && java -cp "\${dir}" Main < "\${inputPath}"\`;
            } else if (language === 'cpp' || language === 'c++') {
              fileName = \`main_\${timestamp}.cpp\`;
              const exeName = \`main_\${timestamp}.exe\`;
              fs.writeFileSync(path.join(tmpDir, fileName), code);
              runCmd = \`g++ "\${path.join(tmpDir, fileName)}" -o "\${path.join(tmpDir, exeName)}" && "\${path.join(tmpDir, exeName)}" < "\${inputPath}"\`;
            } else {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Unsupported language' }));
              return;
            }

            exec(runCmd, { timeout: 10000 }, (error, stdout, stderr) => {
              res.setHeader('Content-Type', 'application/json');
              let outputStr = stdout || stderr || '';
              if (error && !stdout && !stderr) outputStr = error.message;
              if (!outputStr.trim()) outputStr = 'Execution finished with no output.';
              res.end(JSON.stringify({ output: outputStr }));
            });
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });
    }
  }
}

export default defineConfig({
  plugins: [react(), codeExecutorPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/did-api': {
        target: 'https://api.d-id.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\\/did-api/, ''),
        secure: true,
      },
    },
  },
  optimizeDeps: {
    include: ['face-api.js'],
    exclude: ['@met4citizen/talkinghead', '@met4citizen/talkinghead/modules/lipsync-en.mjs']
  },
});
`;

fs.writeFileSync(path, newViteConfig, 'utf8');
console.log('Updated vite.config.js for stdin support!');
