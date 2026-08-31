import "dotenv/config";
import { generateDominicalVideo } from './server/services/dominicalVideoGen.js';

generateDominicalVideo(1, 'pointing-glasses')
  .then(() => {
    console.log('DONE');
    process.exit(0);
  })
  .catch((err) => {
    console.error('SCRIPT FAILED', err);
    process.exit(1);
  });
