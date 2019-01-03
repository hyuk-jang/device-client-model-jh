const _ = require('lodash');
const { BU } = require('base-util-jh');
const { BM } = require('base-model-jh');
require('../format/storage');

// /**
//  * @typedef {Object} controllerStorageContainer
//  * @property {string} deviceCategory
//  * @property {Array} storage
//  */

const AbstDeviceClientModel = require('./AbstDeviceClientModel');

let instance;
class DataStorage extends AbstDeviceClientModel {
  /**
   * @param {dataStorageConfig[]} dataStorageConfigList
   */
  constructor(dataStorageConfigList) {
    super();
    // BU.CLIN(dataStorageConfigList);
    if (instance) {
      return instance;
    }
    instance = this;

    this.dataStorageConfigList = dataStorageConfigList;

    /** @type {dataContainer[]} */
    this.dataContainerList = [];
    // /** @type {Array.<controllerStorageContainer>} */
    // this.deviceControllerStorageList = [];

    this.hasSaveToDB = true;
  }

  /**
   * @override
   * @desc Step 1
   * Device Client 추가
   * @param {deviceInfo|deviceInfo[]} deviceInfo 장치 컨트롤러를 생성하기 위한 객체 설정 정보
   * @param {setDeviceKeyInfo} setDeviceKeyInfo 컨트롤러 ID 및 Category를 쓸 Key Name 정보
   */
  setDevice(deviceInfo, setDeviceKeyInfo) {
    // BU.CLIS(deviceConfigInfo, setDeviceKeyInfo);
    // 설정 정보가 배열 형태라면 재귀 호출
    if (_.isArray(deviceInfo)) {
      deviceInfo.forEach(dInfo => this.setDevice(dInfo, setDeviceKeyInfo));
    }
    // 생성할 카테고리 키 및 컬럼으로 사용할 Column key를 가져옴
    const { deviceCategoryKey, idKey } = setDeviceKeyInfo;

    // 카테고리 정의
    const deviceCategory = _.get(deviceInfo, deviceCategoryKey);

    // Category에 맞는 StorageData를 가져옴
    let dataContainer = this.getDataContainer(deviceCategory);
    // 없다면 새로 생성
    if (dataContainer === undefined) {
      /** @type {dataContainer} */
      dataContainer = {
        deviceCategory,
        dataStorageConfig: _.find(this.dataStorageConfigList, {
          deviceCategory,
        }),
        insertTroubleList: [],
        updateTroubleList: [],
        insertDataList: [],
        dataStorageList: [],
        processingDate: null,
      };

      this.dataContainerList.push(dataContainer);
    }

    const dataStorage = this.getDataStorage(deviceInfo[idKey], deviceCategory);
    if (_.isEmpty(dataStorage)) {
      /** @type {dataStorage} */
      const dataStorageInfo = {
        id: deviceInfo[idKey],
        config: deviceInfo,
        data: null,
        systemErrorList: [],
        troubleList: [],
        convertedDataList: null,
        measureDate: null,
      };
      dataContainer.dataStorageList.push(dataStorageInfo);
      // BU.CLIN(this.deviceDataStorageList);
    } else {
      throw new Error('The device is already registered.');
    }
  }

  /**
   * @override
   * 장치에서 계측한 데이터를 갱신하고자 할 경우 호출
   * @param {deviceOperationInfo|deviceOperationInfo[]} deviceOperationInfo Device Controller getDeviceOperationInfo() 결과
   * @param {string} deviceCategory 장치 Category 'inverter', 'connector'
   */
  onDeviceOperationInfo(deviceOperationInfo, deviceCategory) {
    const dataContainer = this.getDataContainer(deviceCategory);

    if (_.isEmpty(dataContainer)) {
      throw Error(`There is no such device type.[${deviceCategory}] `);
    }

    const dataStorageList = _.isArray(deviceOperationInfo)
      ? deviceOperationInfo
      : [deviceOperationInfo];

    dataStorageList.forEach(deviceOperInfo => {
      this.updateDataStorage(deviceOperInfo, deviceCategory);
    });

    return dataContainer;
  }

  /**
   * @override
   * 지정한 카테고리의 모든 데이터를 순회하면서 db에 적용할 데이터를 정제함.
   * @param {string} deviceCategory  장치 Type 'inverter', 'connector'
   * @param {Date=} processingDate 해당 카테고리를 DB에 처리한 시각. insertData에 저장이 됨
   * @param {boolean} hasIgnoreError 에러를 무시하고 insertData 구문을 실애할 지 여부. default: false
   */
  async refineDataContainer(deviceCategory, processingDate, hasIgnoreError) {
    // BU.CLI('refineTheDataToSaveDB', deviceCategory);
    const dataContainer = this.getDataContainer(deviceCategory);
    // BU.CLIN(dataContainer);

    if (_.isEmpty(dataContainer)) {
      throw new Error(`There is no such device category. [${deviceCategory}]`);
    }
    // 처리 시각 저장
    dataContainer.processingDate = processingDate instanceof Date ? processingDate : new Date();
    const { dataStorageConfig, dataStorageList: storage } = dataContainer;

    // Trouble을 적용할 TableName이 존재해야만 DB에 에러처리를 적용하는 것으로 판단
    const hasApplyToDatabaseForError = !!(
      _.isObject(dataStorageConfig.troubleTableInfo) &&
      _.get(dataStorageConfig, 'troubleTableInfo.tableName')
    );

    const strMeasureDate = BU.convertDateToText(dataContainer.processingDate);
    let remainDbTroublePacketList = [];

    // TODO: Trouble을 DB상에 처리할 것이라면
    if (hasApplyToDatabaseForError) {
      remainDbTroublePacketList = await this.getTroubleList(dataContainer);
      // BU.CLI(dbTroublePacketList);
    }
    // BU.CLI(dbTroublePacketList);

    // 카테고리에 저장되어 있는 저장소의 모든 데이터 점검
    storage.forEach(dataStorage => {
      // 시스템 오류나 장치 이상이 발견된다면 오류발생 처리
      const hasError = !!dataStorage.systemErrorList.length;
      // 시스템 에러가 있다면
      if (hasApplyToDatabaseForError) {
        const resultProcessError = this.processDeviceErrorList(
          dataStorage,
          dataContainer,
          remainDbTroublePacketList,
        );
        // 에러 처리한 결과를 컨테이너에 반영
        _.set(
          dataContainer,
          'insertTroubleList',
          _.concat(
            _.get(dataContainer, 'insertTroubleList', []),
            _.get(resultProcessError, 'insertTroubleList', []),
          ),
        );

        _.set(
          dataContainer,
          'updateTroubleList',
          _.concat(
            _.get(dataContainer, 'updateTroubleList', []),
            _.get(resultProcessError, 'updateTroubleList', []),
          ),
        );

        remainDbTroublePacketList = resultProcessError.dbTroublePacketList;
      }

      // Trouble 이나 System Error가 발생한 계측 데이터는 사용하지 않음. 단 ignore 옵션이 활성화 될 경우 삽입
      if (!hasError || hasIgnoreError === true) {
        _.set(
          dataStorage,
          'convertedDataList',
          this.processDeviceDataList(dataStorage, dataContainer),
        );
        // DB에 저장할 insertDataList에 새로운 insertData를 더함.
        _.set(
          dataContainer,
          'insertDataList',
          _.concat(
            _.get(dataContainer, 'insertDataList', []),
            _.get(dataStorage, 'convertedDataList', []),
          ),
        );
      }
    });

    // 남아있는 dbTroubleList는 Clear 처리
    if (hasApplyToDatabaseForError) {
      remainDbTroublePacketList.forEach(dbTrouble => {
        dbTrouble.occur_date =
          dbTrouble.occur_date instanceof Date
            ? BU.convertDateToText(dbTrouble.occur_date)
            : strMeasureDate;
        dbTrouble.fix_date = strMeasureDate;
        dataContainer.updateTroubleList.push(dbTrouble);
      });
    }

    // insertDataList에 날짜 추가
    _.forEach(dataContainer.insertDataList, insertData => {
      // BU.CLIN(insertData)
      insertData[dataStorageConfig.dataTableInfo.insertDateKey] = strMeasureDate;
    });
    return dataContainer;
  }

  /**
   * @override
   * DB에 컨테이너 단위로 저장된 insertDataList, insertTroubleList, updateTroubleList를 적용
   * @param {string} deviceCategory 카테고리 명
   */
  async saveDataToDB(deviceCategory) {
    // Category에 맞는 StorageData를 가져옴
    const dataContainer = this.getDataContainer(deviceCategory);

    try {
      if (_.isEmpty(dataContainer)) {
        throw new Error(`There is no such device category. [${deviceCategory}]`);
      }

      // DB 접속 정보가 없다면 에러
      if (_.isEmpty(this.biModule)) {
        throw new Error(`There is no DB connection information. [${deviceCategory}]`);
      }

      if (this.hasSaveToDB) {
        // BU.CLI(dataContainer);
        const { dataTableInfo, troubleTableInfo } = dataContainer.dataStorageConfig;

        // 입력할 Data와 저장할 DB Table이 있을 경우
        if (dataContainer.insertDataList.length && dataTableInfo.tableName) {
          await this.biModule.setTables(
            dataTableInfo.tableName,
            dataContainer.insertDataList,
            false,
          );
        }

        // 입력할 Trouble Data가 있을 경우
        if (dataContainer.insertTroubleList.length) {
          await this.biModule.setTables(
            troubleTableInfo.tableName,
            dataContainer.insertTroubleList,
            false,
          );
        }

        // 수정할 Trouble이 있을 경우
        if (dataContainer.updateTroubleList.length) {
          await this.biModule.updateTablesByPool(
            troubleTableInfo.tableName,
            troubleTableInfo.indexInfo.primaryKey,
            dataContainer.updateTroubleList,
            false,
          );
        }
      }
      dataContainer.insertDataList = [];
      dataContainer.insertTroubleList = [];
      dataContainer.updateTroubleList = [];

      return dataContainer;
    } catch (error) {
      // 초기화
      dataContainer.insertDataList = [];
      dataContainer.insertTroubleList = [];
      dataContainer.updateTroubleList = [];

      throw error;
    }
  }

  /**
   * 장치 카테고리에 맞는 타입을 가져옴
   * @param {string} deviceCategory 장치 카테고리 'inverter', 'connector' ... etc
   * @return {dataContainer}
   */
  getDataContainer(deviceCategory) {
    // BU.CLI(this.deviceDataStorageList);
    return _.find(this.dataContainerList, {
      deviceCategory,
    });
  }

  /**
   * 장치 ID를 가진 Data Model 객체 반환
   * @param {string} deviceId 장치 ID
   * @param {string=} deviceCategory 장치 ID
   * @return {dataStorage}
   */
  getDataStorage(deviceId, deviceCategory) {
    // BU.CLIN(this.dataStorageConfigList);
    // BU.CLI(deviceId, deviceCategory);
    try {
      if (deviceCategory.length) {
        const dataContainer = this.getDataContainer(deviceCategory);
        return dataContainer
          ? _.find(dataContainer.dataStorageList, {
              id: deviceId,
            })
          : {};
      }
      let dataStorage = {};
      _.find(this.dataContainerList, deviceDataStorage => {
        const foundDataStorage = _.find(deviceDataStorage.dataStorageList, {
          id: deviceId,
        });
        if (_.isEmpty(foundDataStorage)) {
          return false;
        }
        dataStorage = foundDataStorage;
        return true;
      });
      return dataStorage;
    } catch (error) {
      throw error;
    }
  }

  /**
   * @private
   * Device Controller 부터 받은 데이터
   * @param {deviceOperationInfo} deviceOperationInfo Device Controller getDeviceOperationInfo() 결과
   * @param {string} deviceCategory 장치 Type 'inverter', 'connector'
   */
  updateDataStorage(deviceOperationInfo, deviceCategory) {
    try {
      const { id, config, data, measureDate, systemErrorList, troubleList } = deviceOperationInfo;
      const dataStorage = this.getDataStorage(id, deviceCategory);
      if (_.isEmpty(dataStorage)) {
        throw Error(`fn(onDeviceData) The device is of the wrong id. [${id}]`);
      }
      // 주소 참조 데이터의 고리를 끊고 사본을 저장
      // 상수
      dataStorage.id = id;
      dataStorage.measureDate = measureDate;
      // 상수는 아니나 설정은 변하지 않음.
      dataStorage.config = config;

      dataStorage.data = Array.isArray(data) ? _.cloneDeep(data) : _.clone(data);

      dataStorage.systemErrorList = _.cloneDeep(systemErrorList);

      dataStorage.troubleList = _.cloneDeep(troubleList);

      dataStorage.convertedDataList = [];

      return dataStorage;
    } catch (error) {
      throw error;
    }
  }

  /**
   * @private
   * Device Error 처리. 신규 에러라면 insert, 기존 에러라면 dbTroubleList에서 해당 에러 삭제, 최종으로 남아있는 에러는 update
   * @param {dataStorage} dataStorage
   * @param {dataContainer} dataContainer
   * @param {deviceOperationInfo.<defaultDbTroubleTableScheme>} dbTroublePacketList DB에서 가져온 trouble list.
   */
  processDeviceErrorList(dataStorage, dataContainer, dbTroublePacketList) {
    // BU.CLI('processSystemErrorList', deviceErrorList, categoryInfo.seq, deviceType);
    const insertTroubleList = [];
    const updateTroubleList = [];

    // 에러를 저장할 DB Schema 정보
    const { troubleTableInfo } = dataContainer.dataStorageConfig;
    const measureDeviceConfig = dataStorage.config;

    // 에러를 처리할 대상 설정
    /** @type {Array.<deviceErrorInfo>} */
    let deviceErrorList = [];
    let isSystemError = 0;

    if (!_.isNil(dataStorage.systemErrorList) && dataStorage.systemErrorList.length) {
      isSystemError = 1;
      deviceErrorList = dataStorage.systemErrorList;
    } else if (!_.isNil(dataStorage.troubleList) && dataStorage.troubleList.length) {
      deviceErrorList = dataStorage.troubleList;
    }

    // 저장할때 추가하는 키
    const addObjectParam = {};
    troubleTableInfo.addParamList.forEach(currentItem => {
      addObjectParam[currentItem.toKey] = measureDeviceConfig[currentItem.fromKey];
    });

    // 기존 DB에 저장되어 있는 에러라면 제거
    deviceErrorList.forEach(deviceError => {
      let hasExitError = false;
      // // 기존 시스템 에러가 존재한다면 처리할 필요가 없으므로 dbTroubleList에서 삭제
      _.remove(dbTroublePacketList, dbTrouble => {
        // code 가 같다면 설정 변수 값이 같은지 확인하여 모두 동일하다면 해당 에러 삭제
        if (dbTrouble.code === deviceError.code) {
          // TroubleTableInfo의 AddParam에 명시된 값과 dataStorage의 config Key 값들이 전부 일치 한다면 동일 에러라고 판단
          const everyMatching = _.every(
            troubleTableInfo.addParamList,
            troubleParamInfo =>
              dbTrouble[troubleParamInfo.toKey] === dataStorage.config[troubleParamInfo.fromKey],
          );
          if (everyMatching) {
            hasExitError = true;
          }
          return false;
        }
        // new Error
        return false;
      });

      // 신규 에러라면 insertList에 추가
      if (!hasExitError) {
        const { changeColumnKeyInfo } = troubleTableInfo;
        const { codeKey, fixDateKey, isErrorKey, msgKey, occurDateKey } = changeColumnKeyInfo;
        let addErrorObj = {
          [isErrorKey]: isSystemError,
          [codeKey]: deviceError.code,
          [msgKey]: deviceError.msg,
          [occurDateKey]:
            deviceError.occur_date instanceof Date
              ? BU.convertDateToText(deviceError.occur_date)
              : BU.convertDateToText(dataStorage.measureDate),
          [fixDateKey]: null,
        };

        addErrorObj = Object.assign(addObjectParam, addErrorObj);
        insertTroubleList.push(addErrorObj);
      }
    });

    // 시스템 에러가 발생할 경우 해당 칼럼과 동일한 에러는 수정되었다고 처리
    // Trouble 처리를 하지 않으므로
    if (isSystemError) {
      // ParamList에 적시된 config 값이 동일한 Db Error는 제거
      _.remove(dbTroublePacketList, dbTroubleDataPacket => {
        const hasEqualDevice = _.every(
          troubleTableInfo.addParamList,
          currentItem =>
            dbTroubleDataPacket[currentItem.toKey] === dataStorage[currentItem.fromKey],
        );

        // 모든 config 값이 동일 하다면 시스템 에러가 수정된 것으로 업데이트 처리
        if (hasEqualDevice) {
          dbTroubleDataPacket.occur_date =
            dbTroubleDataPacket.occur_date instanceof Date
              ? BU.convertDateToText(dbTroubleDataPacket.occur_date)
              : BU.convertDateToText(dataStorage.measureDate);
          dbTroubleDataPacket.fix_date = BU.convertDateToText(dataStorage.measureDate);
          updateTroubleList.push(dbTroubleDataPacket);
        }
      });
    }
    return {
      insertTroubleList,
      updateTroubleList,
      dbTroublePacketList,
    };
  }

  /**
   * @private
   * 장치 데이터 리 처리하여 반환
   * @param {dataStorage} dataStorage deviceDataList 요소. 시퀀스 와 측정 날짜
   * @param {dataContainer} dataContainer deviceDataList 요소. 시퀀스 와 측정 날짜
   */
  processDeviceDataList(dataStorage, dataContainer) {
    // 장치 데이터, 장치 설정 정보
    const { data, config } = dataStorage;

    // BU.CLI(data);
    const { dataStorageConfig } = dataContainer;
    const { matchingList, addParamList } = dataStorageConfig.dataTableInfo;

    // 데이터가 Array.<Object> 형태일 경우
    if (_.isArray(data)) {
      const convertDataList = [];
      data.forEach(deviceData => {
        if (
          !_(deviceData)
            .values()
            .without(null)
            .value().length
        ) {
          return false;
        }

        const convertData = {};
        // 계산식 반영
        matchingList.forEach(matchingObj => {
          convertData[matchingObj.toKey] = this.calculateMatchingData(deviceData, matchingObj);
        });

        addParamList.forEach(addParam => {
          convertData[addParam.toKey] = config[addParam.fromKey];
        });

        convertDataList.push(convertData);
      });

      return convertDataList;
    }
    if (_.isObject(data)) {
      if (
        !_(data)
          .values()
          .without(null)
          .value().length
      ) {
        return [];
      }
      const convertData = {};

      // 계산식 반영
      matchingList.forEach(matchingObj => {
        convertData[matchingObj.toKey] = this.calculateMatchingData(data, matchingObj);
      });

      addParamList.forEach(addParam => {
        convertData[addParam.toKey] = config[addParam.fromKey];
      });

      return [convertData];
    }
    return [];
  }

  /**
   * @private
   * 설정 변환키 정보와 계산식을 토대로 반환 값을 계산
   * @param {Object} deviceData 장치 데이터
   * @param {refinedMatchingInfo} refinedMatchingInfo
   * @return {number} 계산 결과
   */
  calculateMatchingData(deviceData, refinedMatchingInfo) {
    // BU.CLIS(deviceData, refinedMatchingInfo);
    // BU.CLI('calculateMatchingData', matchingBindingObj, deviceData);
    let resultCalculate = 0;
    try {
      const { fromKey, toFixed, calculate } = refinedMatchingInfo;
      const reg = /[a-zA-Z]/;
      // 계산식이 숫자일 경우는 eval 하지 않음
      if (_.isNumber(calculate)) {
        let data = deviceData[fromKey];
        data = typeof data === 'string' ? Number(data) : data;
        // 숫자가 아니거나 null일 경우 throw 반환
        if (_.isNumber(data)) {
          resultCalculate = Number((deviceData[fromKey] * calculate).toFixed(toFixed));
          // BU.CLI('resultCalculate', resultCalculate);
        } else {
          resultCalculate = deviceData[fromKey];
          // throw Error(`해당 데이터는 숫자가 아님: ${deviceData[fromKey]}`);
        }
      } else if (typeof calculate === 'string') {
        // 계산식이 문자일 경우 eval 계산식 생성
        let finalMsg = '';
        let tempBuffer = '';
        for (let i = 0; i < calculate.length; i += 1) {
          const thisChar = calculate.charAt(i);
          if (reg.test(thisChar)) {
            tempBuffer += thisChar;
          } else {
            if (tempBuffer !== '') {
              finalMsg += `deviceData['${tempBuffer}']`;
              tempBuffer = '';
            }
            finalMsg += thisChar;
          }
          if (calculate.length === i + 1 && tempBuffer !== '') {
            finalMsg += `deviceData['${tempBuffer}']`;
          }
        }
        resultCalculate = Number(Number(eval(finalMsg)).toFixed(toFixed));
        resultCalculate = _.isNaN(resultCalculate) ? 0 : resultCalculate;
      } else {
        // BU.CLI('deviceData[fromKey]', deviceData[fromKey]);
        resultCalculate = deviceData[fromKey];
      }
    } catch (error) {
      throw error;
    }

    // BU.CLI(resultCalculate);
    return resultCalculate;
  }

  /**
   * @protected 색다르게 필요하다면 구현
   * Device Category 에 접미사 _trouble_data 를 붙이는걸 전제로 함
   * Trouble 형식 --> {${id}, ${seq}, code, msg, occur_date, fix_date}
   * @param {dataContainer} dataContainer deviceDataList 요소. 시퀀스 와 측정 날짜
   */
  getTroubleList(dataContainer) {
    // DB 접속 정보가 없다면 에러
    if (_.isEmpty(this.biModule)) {
      throw new Error('DB information does not exist.');
    }

    const { troubleTableInfo } = dataContainer.dataStorageConfig;
    const { tableName, changeColumnKeyInfo, indexInfo } = troubleTableInfo;
    const { foreignKey, primaryKey } = indexInfo;

    let sql = `
      SELECT o.*
        FROM ${tableName} o                    
          LEFT JOIN ${tableName} b             
              ON o.${changeColumnKeyInfo.codeKey} = b.${
      changeColumnKeyInfo.codeKey
    } AND o.${primaryKey} < b.${primaryKey}
              `;
    if (foreignKey) {
      sql += ` AND  o.${foreignKey} = b.${foreignKey} `;
    }
    sql += `
        WHERE b.${primaryKey} is NULL AND o.${changeColumnKeyInfo.fixDateKey} is NULL
        ORDER BY o.${primaryKey} ASC
    `;

    return this.biModule.db.single(sql);
  }
}
module.exports = DataStorage;
