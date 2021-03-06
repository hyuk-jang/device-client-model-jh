'use strict';

require('./src/format/storage');

const AbstDeviceModel = require('./src/AbstDeviceModel');

module.exports = AbstDeviceModel;

// if __main process
if (require !== undefined && require.main === module) {
  console.log('__main__');

  process.on('uncaughtException', function (err) {
    // BU.debugConsole();
    console.error(err.stack);
    console.log(err.message);
    console.log('Node NOT Exiting...');
  });
  
  
  process.on('unhandledRejection', function (err) {
    // BU.debugConsole();
    console.error(err.stack);
    console.log(err.message);
    console.log('Node NOT Exiting...');
  });
}