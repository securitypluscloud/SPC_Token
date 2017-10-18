var SPCCrowdFund = artifacts.require("./SPCCrowdFund.sol");
var SPCToken = artifacts.require("./SPCToken.sol");

module.exports = function(deployer) {
  deployer.deploy(SPCCrowdFund).then(()=>{
    return deployer.deploy(SPCToken,SPCCrowdFund.address);
  });
 
};
