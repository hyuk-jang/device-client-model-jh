const _ = require('lodash');

const { BM } = require('base-model-jh');

class AbstDeviceClientModel {
  // constructor(config) {
  // }

  /**
   * DB에 저장할 Connector를 생성하기 위한 정보
   * @param {dbInfo} dbInfo
   */
  setDbConnector(dbInfo) {
    console.log('setDbConnector', dbInfo);
    this.biModule = new BM(dbInfo);
  }

  /**
   * Device Client 추가
   * @param {Object} deviceConfigInfo 장치 컨트롤러를 생성하기 위한 객체 설정 정보
   * @param {setDeviceKeyInfo} setDeviceKeyInfo 컨트롤러 ID 및 Category를 쓸 Key Name 정보
   * @return {dataStorageContainer}
   *
   */
  setDevice(deviceConfigInfo, setDeviceKeyInfo) {}

  /**
   * Device Client 추가
   * @return {dataStorageContainer}
   *
   */
  setDeviceForDB() {}

  /**
   * 장치에서 계측한 데이터를 갱신하고자 할 경우 호출
   * @param {deviceOperationInfo|Array.<deviceOperationInfo>} deviceOperationInfo Device Controller getDeviceOperationInfo() 결과
   * @param {string} deviceCategory 장치 Category 'inverter', 'connector'
   * @return {dataStorageContainer}
   */
  onDeviceOperationInfo(deviceOperationInfo, deviceCategory) {}

  /**
   * 지정한 카테고리의 모든 데이터를 순회하면서 db에 적용할 데이터를 정제함.
   * @param {string} deviceCategory  장치 Type 'inverter', 'connector'
   * @param {Date=} processingDate 해당 카테고리를 DB에 처리한 시각. insertData에 저장이 됨
   * @param {boolean} hasIgnoreError 에러를 무시하고 insertData 구문을 실애할 지 여부. default: false
   * @return {dataStorageContainer}
   */
  async refineStorageData(deviceCategory, processingDate, hasIgnoreError) {}

  /**
   * DB에 컨테이너 단위로 저장된 insertDataList, insertTroubleList, updateTroubleList를 적용
   * @param {string} deviceCategory 카테고리 명
   * @return {dataStorageContainer}
   */
  async saveDataToDB(deviceCategory) {}

  /**
   * 장치 저장소 카테고리에 맞는 타입을 가져옴
   * @param {string} storageCategory 저장소 카테고리 'inverter', 'connector' ... etc
   * @return {dataStorageContainer}
   */
  getDataStorageContainer(storageCategory) {}
}
module.exports = AbstDeviceClientModel;

if (require !== undefined && require.main === module) {
  const dcm = new AbstDeviceClientModel();
}
