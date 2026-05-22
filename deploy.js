import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

async function deploy() {
  try {
    console.log('Starting deployment...');
    const { stdout, stderr } = await execAsync(
      'npx netlify-cli deploy --prod --dir=dist --allow-anonymous',
      {
        timeout: 180000,
        env: { ...process.env },
      }
    );
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error('Deployment error:', error.message);
  }
}

deploy();
