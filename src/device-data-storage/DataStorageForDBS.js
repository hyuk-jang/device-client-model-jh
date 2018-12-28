const AbstDeviceClientModel = require('./AbstDeviceClientModel');

let instance;
class DataStorageForDBS extends AbstDeviceClientModel {
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

    /** @type {Array.<dataStorageContainer>} */
    this.dataStorageContainerList = [];
  }

  

  setDeviceForDB() {

  }
}
module.exports = DataStorageForDBS;
