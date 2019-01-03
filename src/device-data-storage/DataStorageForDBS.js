const _ = require('lodash');

const Promise = require('bluebird');

const { BU } = require('base-util-jh');

const AbstDeviceClientModel = require('./AbstDeviceClientModel');

require('../format/block.config');

let instance;
class DataStorageForDBS extends AbstDeviceClientModel {
  constructor() {
    super();
    if (instance) {
      return instance;
    }
    instance = this;

    /** @type {dataContainerDBS[]} */
    this.dataContainerList = [];

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
      const { blockCategory: deviceCategory } = blockInfo;

      // Storage Category에 맞는 Storage가져옴
      let dataContainer = this.getDataContainer(deviceCategory);

      // 없다면 새로 생성
      if (dataContainer === undefined) {
        dataContainer = {
          deviceCategory,
          dataStorageConfig: blockInfo,
          insertTroubleList: [],
          updateTroubleList: [],
          insertDataList: [],
          dataStorageList: [],
          processingDate: null,
        };

        this.dataContainerList.push(dataContainer);
      }

      completeStorageList.push(this.setDataStorageList(blockInfo, dataContainer));
    });

    /** @type {dataContainerDBS[]} */
    const dataStorageList = await Promise.all(completeStorageList);

    return dataStorageList;
  }

  /**
   * DB Table 단위로 Storage 생성
   * @param {blockConfig} blockConfig 테이블 명
   * @param {dataContainerDBS} dataContainer
   */
  async setDataStorageList(blockConfig, dataContainer) {
    const { baseTableInfo } = blockConfig;
    // 참조할 테이블 명, Table에서 식별 가능한 유일 키 컬럼, Table에서 명시한 Place Key 컬럼
    const { tableName, idKey, placeKey } = baseTableInfo;

    // 데이터 저장소에서 관리할 각 Place 객체 정보
    const { dataStorageList } = dataContainer;

    /** @type {Object[]} */
    const tableRows = await this.biModule.getTable(tableName);

    tableRows.forEach(tableRow => {
      /** @type {dataStorageDBS} */
      const dataStorage = {
        id: _.get(tableRow, idKey),
        placeSeq: _.get(tableRow, placeKey),
        nodeList: [],
        troubleList: [],
        convertedNodeData: {},
        measureDate: null,
      };
      dataStorageList.push(dataStorage);
    });

    // Set Delay TEST
    // await Promise.delay(1000);
    return dataContainer;
  }

  // TODO: nodeList binding. DBS
  /**
   * @desc only DBS.
   * dataContainer과 연관이 있는 place Node List를 세팅함.
   * @param {placeInfo[]} placeList
   */
  bindingPlaceList(placeList) {
    this.dataContainerList.forEach(dataContainer => {
      // BU.CLIN(dataContainer.dataStorageList);
    });
  }

  // TODO: category 시 정제 처리
  // insertTroubleList: [], updateTroubleList: [], insertDataList: [] 생성
  /**
   * @override
   * 지정한 카테고리의 모든 데이터를 순회하면서 db에 적용할 데이터를 정제함.
   * @param {string} blockCategory  장치 Type 'inverter', 'connector'
   * @param {Date=} processingDate 해당 카테고리를 DB에 처리한 시각. insertData에 저장이 됨
   * @param {boolean} hasIgnoreError 에러를 무시하고 insertData 구문을 실애할 지 여부. default: false
   */
  async refineDataContainer(blockCategory, processingDate, hasIgnoreError) {}

  //
}
module.exports = DataStorageForDBS;
