require('dotenv').config();

const Promise = require('bluebird');

const { expect } = require('chai');
const { BU } = require('base-util-jh');

const blockConfig = require('./block.config');

const AbstDeviceModel = require('../../src/AbstDeviceModel');

describe('Step 1', () => {
  it.only('setDeviceForDB', async () => {
    const dcm = new AbstDeviceModel();

    await dcm.setDbConnector({
      host: process.env.WEB_DB_HOST,
      database: process.env.WEB_DB_DB,
      port: process.env.WEB_DB_PORT,
      user: process.env.WEB_DB_USER,
      password: process.env.WEB_DB_PW,
    });

    await Promise.delay(100);

    const dataStorageList = await dcm.setDeviceForDB(blockConfig);

    BU.CLIN(dataStorageList);

    expect(dataStorageList.length).to.eq(1);
  });

  it('Async Test', async () => {});
});

// const Converter = require('device-protocol-converter-jh');
