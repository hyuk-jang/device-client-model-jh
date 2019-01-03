require('dotenv').config();

const Promise = require('bluebird');

const { expect } = require('chai');
const { BU } = require('base-util-jh');

const blockConfig = require('./block.config');

const AbstDeviceModel = require('../../src/AbstDeviceModel');

const DBS = require('../../../device-boilerplate-sensor');

const dbInfo = {
  host: process.env.WEB_DB_HOST,
  database: process.env.WEB_DB_DB,
  port: process.env.WEB_DB_PORT,
  user: process.env.WEB_DB_USER,
  password: process.env.WEB_DB_PW,
};

describe('Step 1', () => {
  // TEST: DBS 테스트
  // 1. DB 접속 정보(mysql)를 바탕으로 dataContainer를 구성.
  // 2. 가상 placeList를 바탕으로 dataStorage 단위로 nodeInfo 를 붙임.
  // 3. nodeInfo에 가상 데이터를 입력하고 해당 데이터를 정제하여 DB에 입력할 수 있는 데이터로 가공.
  it.only('setDeviceForDB', async () => {
    const dcm = new AbstDeviceModel();

    // 1. DB 접속 정보(mysql)를 바탕으로 dataContainer를 구성.
    await dcm.setDbConnector(dbInfo);

    const dataStorageList = await dcm.setDeviceForDB(blockConfig);

    expect(dataStorageList.length).to.eq(1);

    // 2. 가상 placeList를 바탕으로 dataStorage 단위로 nodeInfo 를 붙임.
    const dbs = new DBS();
    const controller = dbs.createControl();

    await controller.getDataLoggerListByDB(dbInfo);
    await controller.init();

    dcm.bindingPlaceList(controller.placeList);

    // BU.CLIN(controller.placeList);
  });

  it('bindingPlaceList', async () => {});
});

// const Converter = require('device-protocol-converter-jh');
