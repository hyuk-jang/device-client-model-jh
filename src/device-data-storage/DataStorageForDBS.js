const _ = require('lodash');

const Promise = require('bluebird');

const { BU } = require('base-util-jh');

const AbstDeviceClientModel = require('./AbstDeviceClientModel');

require('../format/block.config');

let instance;
class DataStorageForDBS extends AbstDeviceClientModel {
  constructor() {
    super();
    // BU.CLIN(dataStorageConfigList);
    if (instance) {
      return instance;
    }
    instance = this;

    /** @type {dataStorageContainer[]} */
    this.dataStorageContainerList = [];

    this.hasSaveToDB = true;
  }

  /**
   *
   * @param {blockConfig[]} blockConfigList
   */
  async setDeviceForDB(blockConfigList) {
    BU.CLI('setDeviceForDB');
    const completeStorageList = [];

    blockConfigList.forEach(blockInfo => {
      const { blockCategory } = blockInfo;

      // Storage Category에 맞는 Storage가져옴
      let dataStorageContainer = this.getDataStorageContainer(blockCategory);

      // 없다면 새로 생성
      if (dataStorageContainer === undefined) {
        dataStorageContainer = {
          blockCategory,
          dataStorageConfig: blockInfo,
          insertTroubleList: [],
          updateTroubleList: [],
          insertDataList: [],
          storage: [],
          processingDate: null,
        };

        this.dataStorageContainerList.push(dataStorageContainer);
      }

      completeStorageList.push(this.setDataStorage(blockInfo, dataStorageContainer));
    });

    /** @type {dataStorageContainer[]} */
    const dataStorageList = await Promise.all(completeStorageList);

    return dataStorageList;
  }

  /**
   * DB Table 단위로 Storage 생성
   * @param {blockConfig} blockConfig 테이블 명
   * @param {dataStorageContainer} dataStorageContainer
   */
  async setDataStorage(blockConfig, dataStorageContainer) {
    const { baseTableInfo } = blockConfig;
    // 참조할 테이블 명, Table에서 식별 가능한 유일 키 컬럼, Table에서 명시한 Place Key 컬럼
    const { tableName, idKey, placeKey } = baseTableInfo;

    // 데이터 저장소에서 관리할 각 Place 객체 정보
    const { storage } = dataStorageContainer;

    /** @type {{}[]} */
    const tableRows = await this.biModule.getTable(tableName);

    tableRows.forEach(tableRow => {
      /** @type {dataStorage} */
      const dataStorageInfo = {
        id: _.get(tableRow, idKey),
        placeSeq: _.get(tableRow, placeKey),
        data: null,
        troubleList: [],
        convertedDataList: null,
        measureDate: null,
      };
      storage.push(dataStorageInfo);
    });

    // Set Delay TEST
    await Promise.delay(1000);
    return dataStorageContainer;
  }
}
module.exports = DataStorageForDBS;
