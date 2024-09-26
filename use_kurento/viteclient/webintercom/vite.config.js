import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
import fs from 'fs';



var server = {}
if (fs.existsSync('./_keys/server.crt') && fs.existsSync('./_keys/server.key')) {
  server = {
    https : {
        key: fs.readFileSync('./_keys/server.key'),
        cert: fs.readFileSync('./_keys/server.crt')
      }
    }
}
// https://vitejs.dev/config/
export default defineConfig({
    server
//   plugins: [react()],
});
