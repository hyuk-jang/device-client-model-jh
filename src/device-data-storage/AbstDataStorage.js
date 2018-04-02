'use strict';

require('../format/storage');


class AbstDataStorage {
  constructor() {
  }

  /**
   * Device Client 추가
   * @param {Object} deviceConfigInfo 장치 컨트롤러를 생성하기 위한 객체 설정 정보
   * @param {setDeviceKeyInfo} setDeviceKeyInfo 컨트롤러 ID 및 Category를 쓸 Key Name 정보 
   * @return {dataStorageContainer}
   * 
   */
  setDevice() {}

  /**
   * 장치에서 계측한 데이터를 갱신하고자 할 경우 호출
   * @param {deviceOperationInfo|Array.<deviceOperationInfo>} deviceOperationInfo Device Controller getDeviceOperationInfo() 결과
   * @param {string} deviceCategory 장치 Category 'inverter', 'connector'
   * @return {dataStorageContainer}
   */
  onDeviceOperationInfo() {}

  /**
   * 지정한 카테고리의 모든 데이터를 순회하면서 db에 적용할 데이터를 정제함.
   * @param {string} deviceCategory  장치 Type 'inverter', 'connector'
   * @param {Date=} processingDate 해당 카테고리를 DB에 처리한 시각. insertData에 저장이 됨
   * @return {dataStorageContainer}
   */
  async refineTheDataToSaveDB() {}

  /**
   * DB에 컨테이너 단위로 저장된 insertDataList, insertTroubleList, updateTroubleList를 적용
   * @param {string} deviceCategory 카테고리 명
   * @return {dataStorageContainer}
   */
  async saveDataToDB() {}




}

module.exports = AbstDataStorage;