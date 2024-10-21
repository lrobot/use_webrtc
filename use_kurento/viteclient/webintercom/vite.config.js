import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
import fs from 'fs';

import react from '@vitejs/plugin-react'



var server = {}
if (fs.existsSync('./_keys/server.crt') && fs.existsSync('./_keys/server.key')) {
  server = {
    https : {
        key: fs.readFileSync('./_keys/server.key'),
        cert: fs.readFileSync('./_keys/server.crt')
      }
    }
    console.log(' https://srv.rbat.tk:5173/')
} else {
    console.log(' http://srv.rbat.tk:5173/')
}
// https://vitejs.dev/config/
export default defineConfig({
    server,
    plugins: [react()],
});
