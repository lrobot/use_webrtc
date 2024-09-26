// import './pre-start'; // Must be the first import
// import logger from 'jet-logger';

// import EnvVars from '@src/common/EnvVars';
// import server from './server';
import RtcMain from './main';
let rtcMain = new RtcMain();
(async () => {
  await rtcMain.start();
})();
// **** Run **** //

//const SERVER_START_MSG = ('Express server started on port: ' + EnvVars.Port.toString());

//server.listen(EnvVars.Port, () => logger.info(SERVER_START_MSG));
