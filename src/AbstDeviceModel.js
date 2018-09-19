const DataStorage = require('./device-data-storage/DataStorage');

require('./format/storage');

/** @type {DataStorage} */
let dataStorage = {};
class AbstDeviceModel {
  /**
   * @param {Array.<refinedDeviceDataConfig>} refinedDeviceDataConfigList
   */
  constructor(refinedDeviceDataConfigList) {
    /** @private */
    dataStorage = new DataStorage(refinedDeviceDataConfigList);
  }

  /**
   *
   * @param {boolean} hasSaveToDB
   */
  setHasSaveToDB(hasSaveToDB) {
    dataStorage.hasSaveToDB = hasSaveToDB;
  }

  /**
   * DB에 저장할 Connector를 생성하기 위한 정보
   * @param {dbInfo} dbInfo
   */
  setDbConnector(dbInfo) {
    return dataStorage.setDbConnector(dbInfo);
  }

  /**
   * Device Client 추가
   * @param {Object} deviceConfigInfo 장치 컨트롤러를 생성하기 위한 객체 설정 정보
   * @param {setDeviceKeyInfo} setDeviceKeyInfo 컨트롤러 ID 및 Category를 쓸 Key Name 정보
   * @return {dataStorageContainer}
   *
   */
  setDevice(deviceConfigInfo, setDeviceKeyInfo) {
    return dataStorage.setDevice(deviceConfigInfo, setDeviceKeyInfo);
  }

  /**
   * 장치에서 계측한 데이터를 갱신하고자 할 경우 호출
   * @param {deviceOperationInfo|Array.<deviceOperationInfo>} deviceOperationInfo Device Controller getDeviceOperationInfo() 결과
   * @param {string} deviceCategory 장치 Category 'inverter', 'connector'
   * @return {dataStorageContainer}
   */
  onDeviceOperationInfo(deviceOperationInfo, deviceCategory) {
    return dataStorage.onDeviceOperationInfo(deviceOperationInfo, deviceCategory);
  }

  /**
   * 지정한 카테고리의 모든 데이터를 순회하면서 db에 적용할 데이터를 정제함.
   * @param {string} deviceCategory  장치 Type 'inverter', 'connector'
   * @param {Date=} processingDate 해당 카테고리를 DB에 처리한 시각. insertData에 저장이 됨
   * @param {boolean} hasIgnoreError 에러를 무시하고 insertData 구문을 실애할 지 여부. default: false
   * @return {dataStorageContainer}
   */
  async refineTheDataToSaveDB(deviceCategory, processingDate, hasIgnoreError) {
    const dataStorageContainer = await dataStorage.refineTheDataToSaveDB(
      deviceCategory,
      processingDate,
      hasIgnoreError,
    );
    return dataStorageContainer;
  }

  /**
   * DB에 컨테이너 단위로 저장된 insertDataList, insertTroubleList, updateTroubleList를 적용
   * @param {string} deviceCategory 카테고리 명
   * @return {dataStorageContainer}
   */
  async saveDataToDB(deviceCategory) {
    const dataStorageContainer = await dataStorage.saveDataToDB(deviceCategory);
    return dataStorageContainer;
  }
}
module.exports = AbstDeviceModel;
