const SPCToken = artifacts.require("./SPCToken.sol");
const SPCCrowdFund = artifacts.require("./SPCCrowdFund.sol");
const Utils = require('./helpers/Utils');
const BigNumber = require('bignumber.js');


let founderwalletAddress = "0xf50ace12e0537111be782899fd5c4f5f638340d5";
let owner;



async function timeJump(timeToInc) {
    return new Promise((resolve, reject) => {
        web3
            .currentProvider
            .sendAsync({
                jsonrpc: '2.0',
                method: 'evm_increaseTime',
                params: [(timeToInc)] // timeToInc is the time in seconds to increase
            }, function (err, result) {
                if (err) {
                    reject(err);
                }
                resolve(result);
            });
    })
}


contract("SPCCrowdFund",(accounts)=>{
    before(async ()=>{
        owner = accounts[0];
        let crowdsale = await SPCCrowdFund.new({from:owner});
    });

it("SPCCrowdFund: constructor verifies all the initialization parameter",async()=>{
    let crowdsale = await SPCCrowdFund.new({from:owner});
    let _owner = await crowdsale.owner.call();
    assert.strictEqual(_owner,owner);
});

it("verifies the pre-assigned variable",async()=>{
    let crowdsale = await SPCCrowdFund.new({from:owner});

    let _preSaleStartTime = await crowdsale.preSaleStartTime.call();
    assert.strictEqual(_preSaleStartTime.toNumber(),1509494401);

    let _preSaleEndTime = await crowdsale.preSaleEndTime.call();
    assert.strictEqual(_preSaleEndTime.toNumber(),1510531199);

    let _crowdfundStartDate = await crowdsale.crowdfundStartDate.call();
    assert.strictEqual(_crowdfundStartDate.toNumber(),1511308801);

    let _crowdfundEndDate = await crowdsale.crowdfundEndDate.call();
    assert.strictEqual(_crowdfundEndDate.toNumber(),1515283199);

});


it("setFounderMultiSigAddress: should set the new founder wallet address",async ()=>{
    let crowdsale = await SPCCrowdFund.new({from:owner});

    await crowdsale.setFounderMultiSigAddress(accounts[7],{from:founderwalletAddress});
    let _newfounderAddress = await crowdsale.founderMultiSigAddress.call();
    assert.strictEqual(_newfounderAddress,accounts[7]);
    
});


it("setFounderMultiSigAddress: should set the new founder wallet address --fail not called by the founder",async ()=>{
    let crowdsale = await SPCCrowdFund.new({from:owner});
    try {
    await crowdsale.setFounderMultiSigAddress(accounts[7],{from:accounts[7]});
    } catch(error) {
        return Utils.ensureException(error);
    }
});


it('setTokenAddress: should set the token', async() => {
    let crowdsale = await SPCCrowdFund.new({from:owner});
    let token = await SPCToken.new(crowdsale.address,{from:owner});
    await crowdsale.setTokenAddress(token.address, {from: owner});
    let _tokenAddress = await crowdsale
        .token
        .call();
    assert.equal(_tokenAddress, token.address);
});

it('setTokenAddress:should set the token -- fails called other than owner',
async() => {
    let crowdsale = await SPCCrowdFund.new({from:owner});
    let token = await SPCToken.new(crowdsale.address,{from:owner});

    try {
        await crowdsale.setTokenAddress(token.address, {from: accounts[6]});
    } catch (error) {
        return Utils.ensureException(error);
    }
});

it('setTokenAddress:should fail when token is already set', async() => {
    let crowdsale = await SPCCrowdFund.new({from:owner});
    let token = await SPCToken.new(crowdsale.address,{from:owner});

    await crowdsale.setTokenAddress(token.address, {from: owner});
    let _tokenAddress = await crowdsale
        .token
        .call();
    assert.equal(_tokenAddress, token.address);
    try {
        await crowdsale.setTokenAddress(token.address, {from: owner});
    } catch (error) {
        return Utils.ensureException(error);
    }
});


it("Enter in the presale state",
async() =>{
    let crowdsale = await SPCCrowdFund.new({from:owner});
    let token = await SPCToken.new(crowdsale.address,{from:owner});
    let currentTime = Math.floor(Date.now() / 1000);
    let presaleTime = await crowdsale
        .preSaleStartTime
        .call();
    let durationDiff = await Utils.timeDifference(presaleTime.toNumber(), currentTime);
    let durationToInc = Math.floor(durationDiff + 5000);
    await timeJump(durationToInc);
});


it("buyTokens: should buy the tokens -- fail because token is not set",
async()=>{
    let crowdsale = await SPCCrowdFund.new({from:owner});
    let token = await SPCToken.new(crowdsale.address,{from:owner});
    try {
     await crowdsale.buyTokens(accounts[8],{
            from:accounts[8], 
            value: new BigNumber(10).times(new BigNumber(10).pow(18)),
            gas:200000 
        });
    } catch(error) {
        return Utils.ensureException(error);
    }
   
});

it("buyTokens: should buy the tokens -- fail because msg.value is 0",
async()=>{
    let crowdsale = await SPCCrowdFund.new({from:owner});
    let token = await SPCToken.new(crowdsale.address,{from:owner});
    await crowdsale.setTokenAddress(token.address, {from: owner});
    try {
       await crowdsale.buyTokens(accounts[8],{
            from:accounts[8], 
            value:0,
            gas:200000 
        });
    } catch(error) {
        return Utils.ensureException(error);
    }
   
});

it("buyTokens in the presale state",
async()=>{
    let crowdsale = await SPCCrowdFund.new({from:owner});
    let token = await SPCToken.new(crowdsale.address,{from:owner});
    await crowdsale.setTokenAddress(token.address, {from: owner});
    console.log(web3.eth.getBlock('latest').timestamp);
    await crowdsale.buyTokens(accounts[8],{
        from:accounts[8], 
        gas:2000000 ,
        value: new BigNumber(1).times(new BigNumber(10).pow(18)),
        
    });
    console.log(web3.eth.getBlock('latest').timestamp);
    
    let balance = await token.balanceOf(accounts[8]);
    assert.strictEqual(balance.dividedBy(new BigNumber(10).pow(18)).toNumber(),450);
    let weiRaised = await crowdsale.totalWeiRaised.call();
    assert.strictEqual(weiRaised.dividedBy(new BigNumber(10).pow(18)).toNumber(),1);
});
    

it("buyTokens in the presale after the end of presale",
async()=>{
    let crowdsale = await SPCCrowdFund.new({from:owner});
    let token = await SPCToken.new(crowdsale.address,{from:owner});
    await crowdsale.setTokenAddress(token.address, {from: owner});
    await timeJump(12 * 24 * 60 * 60);

    try{
        await crowdsale.buyTokens(accounts[8],{
            from:accounts[7], 
            value: new BigNumber(1).times(new BigNumber(10).pow(18)),
            gas:2000000 
       });
    } catch(error) {
       return Utils.ensureException(error);
    }

});


it("buyTokens in the crowdsale state",
async()=>{

    let crowdsale = await SPCCrowdFund.new({from:owner});
    let token = await SPCToken.new(crowdsale.address,{from:owner});
    await crowdsale.setTokenAddress(token.address, {from: owner});

    // time jump to enter in the crowdsale

    await timeJump(9 * 24 * 60 *60);

    await crowdsale.buyTokens(accounts[8],{
        from:accounts[8], 
        value: new BigNumber(10).times(new BigNumber(10).pow(18)),
        gas:2000000 
    });
    let balance = await token.balanceOf(accounts[8]);
    assert.strictEqual(balance.dividedBy(new BigNumber(10).pow(18)).toNumber(),3900);
    let weiRaised = await crowdsale.totalWeiRaised.call();
    assert.strictEqual(weiRaised.dividedBy(new BigNumber(10).pow(18)).toNumber(),10);
});


it("buyTokens after the end of crowdsale state",
async()=>{

    let crowdsale = await SPCCrowdFund.new({from:owner});
    let token = await SPCToken.new(crowdsale.address,{from:owner});
    await crowdsale.setTokenAddress(token.address, {from: owner});

    // time jump to end the crowdsale

    await timeJump(46 * 24 * 60 * 60 );

    try{
        await crowdsale.buyTokens(accounts[8],{
        from:accounts[8], 
        value: new BigNumber(10).times(new BigNumber(10).pow(18)),
        gas:2000000 
    });
    } catch(error) {
        return Utils.ensureException(error);
    }
});

it("endCrowdfund: should transfer the remaining token to the founder address",
async()=>{
    
    let crowdsale = await SPCCrowdFund.new({from:owner});
    let token = await SPCToken.new(crowdsale.address,{from:owner});
    await crowdsale.setTokenAddress(token.address, {from: owner});


        await crowdsale.endCrowdfund({
            from:founderwalletAddress,
            gas:200000
        });
    let balance = await token.balanceOf(founderwalletAddress).call();
    assert.strictEqual(balance.dividedBy(new BigNumber(10).pow(18)).toNumber(),250000000);
});


});