const SPCToken = artifacts.require("./SPCToken.sol");
const SPCCrowdFund = artifacts.require("./SPCCrowdFund.sol");
const Utils = require('./helpers/Utils');
const BigNumber = require('bignumber.js');

let investor;
let crowdsale;
let owner;
let founderAdd = "0x70b0ea058aee845342b09f1769a2be8deb46aa86";
let bonusAllocAdd = "0x95817119b58d195c10a935de6fa4141c2647aa56";
let bountyAllocAdd = "0x6272a7521c60de62abc048f7b40f61f775b32d78";
let ltpAddress = "0x00a6858fe26c326c664a6b6499e47d72e98402bb";
let crowdSaleAddress;

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

contract("SPCToken",(accounts)=>{
    before(async ()=>{
        owner = accounts[0];
        crowdsale = await SPCCrowdFund.new({from:owner});
        investor = accounts[8];
        crowdSaleAddress = accounts[1];
    });

it("SPCToken: verify the constructor",async()=>{
    let crowdsale = await SPCCrowdFund.new({from:owner});
    let token = await SPCToken.new(crowdsale.address,{from:owner});
    
    let _owner = await token.owner.call();
    assert.equal(_owner,owner);
    
    let _crowdfundAddress = await token.crowdFundAddress.call();
    assert.equal(_crowdfundAddress,crowdsale.address);
    
    let _keyEmployeesAllocation = await token.keyEmployeesAllocation.call();
    assert.strictEqual(_keyEmployeesAllocation.dividedBy(new BigNumber(10).pow(18)).toNumber(),50000000);
    
    let _bountiesAllocation = await token.bountiesAllocation.call();
    assert.strictEqual(_bountiesAllocation.dividedBy(new BigNumber(10).pow(18)).toNumber(),35000000);
    
    let _tokensAllocatedToCrowdFund = await token.tokensAllocatedToCrowdFund.call();
    assert.strictEqual(_tokensAllocatedToCrowdFund.dividedBy(new BigNumber(10).pow(18)).toNumber(),250000000);

    let _longTermBudgetAllocation = await token.longTermBudgetAllocation.call();
    assert.strictEqual(_longTermBudgetAllocation.dividedBy(new BigNumber(10).pow(18)).toNumber(),100000000);

    let _bonusAllocation = await token.bonusAllocation.call();
    assert.strictEqual(_bonusAllocation.dividedBy(new BigNumber(10).pow(18)).toNumber(),65000000);

    let _totalAllocatedTokens = await token.totalAllocatedTokens.call();
    assert.strictEqual(_totalAllocatedTokens.dividedBy(new BigNumber(10).pow(18)).toNumber(),250000000);

});

 it("verify the pre assigned parameters",async ()=>{
    let crowdsale = await SPCCrowdFund.new({from:owner});
    let token = await SPCToken.new(crowdsale.address,{from:owner});

    let tokenName = await token.name.call();
    assert.equal(tokenName.toString(),"SecurityPlusCloud Token");

    let tokenSymbol = await token.symbol.call();
    assert.equal(tokenSymbol.toString(),"SPC");

    let tokenDecimal = await token.decimals.call();
    assert.strictEqual(tokenDecimal.toNumber(),18);

    let supply = await token.totalSupply.call();
    assert.equal(supply.dividedBy(new BigNumber(10).pow(18)).toNumber(),500000000);

    let _founderMultiSigAddress = await token.founderMultiSigAddress.call();
    assert.equal(_founderMultiSigAddress.toString(),founderAdd);

    let _bonusAllocAddress = await token.bonusAllocAddress.call();
    assert.equal(_bonusAllocAddress.toString(),bonusAllocAdd);

    let _bountiesAllocAddress = await token.bountiesAllocAddress.call();
    assert.equal(_bountiesAllocAddress.toString(),bountyAllocAdd);

    let _longTermbudgetAllocAddress = await token.longTermbudgetAllocAddress.call();
    assert.equal(_longTermbudgetAllocAddress.toString(),ltpAddress);

 });

 it("changeFounderMultiSigAddress:should able to change the founder wallet address",async()=>{
    let crowdsale = await SPCCrowdFund.new({from:owner});
    let token = await SPCToken.new(crowdsale.address,{from:owner});

    await token.changeFounderMultiSigAddress(accounts[2],{from:founderAdd});
    let newFounderAddress = await token.founderMultiSigAddress.call();
    assert.equal(newFounderAddress,accounts[2]);
 });


 it("changeFounderMultiSigAddress:should able to change the founder wallet address -- fail because it not called by the founder",async()=>{
    let crowdsale = await SPCCrowdFund.new({from:owner});
    let token = await SPCToken.new(crowdsale.address,{from:owner});

    try {
        await token.changeFounderMultiSigAddress(accounts[2],{from:accounts[3]});
    } catch(error) {
        return Utils.ensureException(error);
    }    
 });

 it("changeFounderMultiSigAddress:should able to change the founder wallet address -- fail because new address is zero",async()=>{
    let crowdsale = await SPCCrowdFund.new({from:owner});
    let token = await SPCToken.new(crowdsale.address,{from:owner});

    try {
        await token.changeFounderMultiSigAddress(0x0,{from:accounts[3]});
    } catch(error) {
        return Utils.ensureException(error);
    }    
 });


  // ///////////////////////////////////////// Transfer // ///////////////////////////////////////

  it('transfer: ether directly to the token contract -- it will throw', async() => {
    let crowdsale = await SPCCrowdFund.new({from:owner});
    let token = await SPCToken.new(crowdsale.address,{from:owner});
    try {
        await web3
            .eth
            .sendTransaction({
                from: investor,
                to: token.address,
                value: web3.toWei('10', 'Ether')
            });
    } catch (error) {
        return Utils.ensureException(error);
    }
});

it('transfer: should transfer 10000 to investor from crowdsale', async() => {
    let token = await SPCToken.new(crowdSaleAddress,{from:owner});
    await token.transfer(investor, new BigNumber(10000).times(new BigNumber(10).pow(18)), {from:crowdSaleAddress});
    let balance = await token
        .balanceOf
        .call(investor);
    assert.strictEqual(balance.dividedBy(new BigNumber(10).pow(18)).toNumber(), 10000);
});

it('transfer: first should transfer 10000 to investor from crowdsale then investor transfers 1000 to accounts[7]',
async() => {
    let token = await SPCToken.new(crowdSaleAddress,{from:owner});
    await token.transfer(investor, new BigNumber(10000).times(new BigNumber(10).pow(18)), {from: crowdSaleAddress});
    let balance = await token
        .balanceOf
        .call(investor);
    assert.strictEqual(balance.dividedBy(new BigNumber(10).pow(18)).toNumber(), 10000);
    await token.transfer(accounts[7], new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: investor});
    let accBalance = await token
        .balanceOf
        .call(accounts[7]);
    assert.strictEqual(accBalance.dividedBy(new BigNumber(10).pow(18)).toNumber(), 1000);
});

it('transfer: should fail when trying to transfer zero', async() => {
    let token = await SPCToken.new(crowdSaleAddress,{from:owner});
    try {
        await token.transfer(investor, new BigNumber(0).times(new BigNumber(10).pow(18)), {from: crowdSaleAddress});
    } catch (error) {
        return Utils.ensureException(error);
    }
});

it('approve: msg.sender should approve 1000 to investor', async() => {
    let token = await SPCToken.new(crowdSaleAddress,{from:owner});
    await token.approve(investor, new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: crowdSaleAddress});
    let _allowance = await token
        .allowance
        .call(crowdSaleAddress,investor);
    assert.strictEqual(_allowance.dividedBy(new BigNumber(10).pow(18)).toNumber(),1000);
});

it('approve: msg.sender should approve 1000 to accounts[7] & withdraws 200 once', async() => {
    let token = await SPCToken.new(crowdSaleAddress,{from:owner});
    await token.transfer(investor, new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: crowdSaleAddress});
    await token.approve(accounts[7], new BigNumber(1000).times(new BigNumber(10).pow(18)), {from:investor});
    let _allowance1 = await token
        .allowance
        .call(investor, accounts[7]);
    assert.strictEqual(_allowance1.dividedBy(new BigNumber(10).pow(18)).toNumber(), 1000);
    await token.transferFrom(investor, accounts[6], new BigNumber(200).times(new BigNumber(10).pow(18)), {from: accounts[7]});
    let balance = await token
        .balanceOf
        .call(accounts[6]);
    assert.strictEqual(balance.dividedBy(new BigNumber(10).pow(18)).toNumber(), 200);
    let _allowance2 = await token
        .allowance
        .call(investor, accounts[7]);
    assert.strictEqual(_allowance2.dividedBy(new BigNumber(10).pow(18)).toNumber(), 800);
    let _balance = await token
        .balanceOf
        .call(investor);
    assert.strictEqual(_balance.dividedBy(new BigNumber(10).pow(18)).toNumber(), 800);

});

it('approve: msg.sender should approve 1000 to accounts[7] & withdraws 200 twice', async() => {
    let token = await SPCToken.new(crowdSaleAddress,{from:owner});
    await token.transfer(investor, new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: crowdSaleAddress});
    await token.approve(accounts[7], new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: investor});
    let _allowance1 = await token
        .allowance
        .call(investor, accounts[7]);
    assert.strictEqual(_allowance1.dividedBy(new BigNumber(10).pow(18)).toNumber(), 1000);
    await token.transferFrom(investor, accounts[6], new BigNumber(200).times(new BigNumber(10).pow(18)), {from: accounts[7]});
    let _balance1 = await token
        .balanceOf
        .call(accounts[6]);
    assert.strictEqual(_balance1.dividedBy(new BigNumber(10).pow(18)).toNumber(), 200);
    let _allowance2 = await token
        .allowance
        .call(accounts[8], accounts[7]);
    assert.strictEqual(_allowance2.dividedBy(new BigNumber(10).pow(18)).toNumber(), 800);
    let _balance2 = await token
        .balanceOf
        .call(accounts[8]);
    assert.strictEqual(_balance2.dividedBy(new BigNumber(10).pow(18)).toNumber(), 800);
    await token.transferFrom(investor, accounts[5], new BigNumber(200).times(new BigNumber(10).pow(18)), {from: accounts[7]});
    let _balance3 = await token
        .balanceOf
        .call(accounts[5]);
    assert.strictEqual(_balance3.dividedBy(new BigNumber(10).pow(18)).toNumber(), 200);
    let _allowance3 = await token
        .allowance
        .call(investor, accounts[7]);
    assert.strictEqual(_allowance3.dividedBy(new BigNumber(10).pow(18)).toNumber(), 600);
    let _balance4 = await token
        .balanceOf
        .call(investor);
    assert.strictEqual(_balance4.dividedBy(new BigNumber(10).pow(18)).toNumber(), 600);
});

it('Approve max (2^256 - 1)', async() => {
    let token = await SPCToken.new(crowdSaleAddress,{from:owner});
    await token.approve(investor, '115792089237316195423570985008687907853269984665640564039457584007913129639935', {from: accounts[7]});
    let _allowance = await token.allowance(accounts[7],investor);
    let result = _allowance.equals('1.15792089237316195423570985008687907853269984665640564039457584007913129639935e' +
            '+77');
    assert.isTrue(result);
});

it('approves: msg.sender approves accounts[7] of 1000 & withdraws 800 & 500 (2nd tx should fail)',
async() => {
    let token = await SPCToken.new(crowdSaleAddress,{from:owner});
    await token.transfer(investor, new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: crowdSaleAddress});
    await token.approve(accounts[7], new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: investor});
    let _allowance1 = await token
        .allowance
        .call(investor, accounts[7]);
    assert.strictEqual(_allowance1.dividedBy(new BigNumber(10).pow(18)).toNumber(), 1000);
    await token.transferFrom(investor, accounts[6], new BigNumber(800).times(new BigNumber(10).pow(18)), {from: accounts[7]});
    let _balance1 = await token
        .balanceOf
        .call(accounts[6]);
    assert.strictEqual(_balance1.dividedBy(new BigNumber(10).pow(18)).toNumber(), 800);
    let _allowance2 = await token
        .allowance
        .call(investor, accounts[7]);
    assert.strictEqual(_allowance2.dividedBy(new BigNumber(10).pow(18)).toNumber(), 200);
    let _balance2 = await token
        .balanceOf
        .call(investor);
    assert.strictEqual(_balance2.dividedBy(new BigNumber(10).pow(18)).toNumber(), 200);
    try {
        await token.transferFrom(investor, accounts[6], new BigNumber(500).times(new BigNumber(10).pow(18)), {from: accounts[7]});
    } catch (error) {
        return Utils.ensureException(error);
    }
});


it('transferFrom: Attempt to  withdraw from account with no allowance  -- fail', async() => {
    let token = await SPCToken.new(crowdSaleAddress,{from:owner});
    await token.transfer(investor, new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: crowdSaleAddress});
    try {
        await token
            .transferFrom
            .call(investor, accounts[6], new BigNumber(100).times(new BigNumber(10).pow(18)), {from: accounts[7]});
    } catch (error) {
        return Utils.ensureException(error);
    }
});

it('transferFrom: Allow accounts[7] 1000 to withdraw from investor. Withdraw 800 and then approve 0 & attempt transfer',
async() => {
    let token = await SPCToken.new(crowdSaleAddress,{from:owner});
    await token.transfer(investor, new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: crowdSaleAddress});
    await token.approve(accounts[7], new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: investor});
    let _allowance1 = await token
        .allowance
        .call(investor, accounts[7]);
    assert.strictEqual(_allowance1.dividedBy(new BigNumber(10).pow(18)).toNumber(), 1000);
    await token.transferFrom(investor, accounts[6], new BigNumber(200).times(new BigNumber(10).pow(18)), {from: accounts[7]});
    let _balance1 = await token
        .balanceOf
        .call(accounts[6]);
    assert.strictEqual(_balance1.dividedBy(new BigNumber(10).pow(18)).toNumber(), 200);
    let _allowance2 = await token
        .allowance
        .call(investor, accounts[7]);
    assert.strictEqual(_allowance2.dividedBy(new BigNumber(10).pow(18)).toNumber(), 800);
    let _balance2 = await token
        .balanceOf
        .call(investor);
    assert.strictEqual(_balance2.dividedBy(new BigNumber(10).pow(18)).toNumber(), 800);
    await token.approve(accounts[7], 0, {from: investor});
    try {
        await token.transferFrom(investor, accounts[6], new BigNumber(200).times(new BigNumber(10).pow(18)), {from: accounts[7]});
    } catch (error) {
        return Utils.ensureException(error);
    }
});

it('changeTotalSupply: verifies the functionality of updating the variable totalAllocatedTokens',
async() => {
    let token = await SPCToken.new(crowdSaleAddress,{from:owner});
    await token.changeTotalSupply(new BigNumber(10).times(new BigNumber(10).pow(18)), {from: crowdSaleAddress});
    let allocation = await token
        .totalAllocatedTokens
        .call();
    assert.strictEqual(allocation.dividedBy(new BigNumber(10).pow(18)).toNumber(),250000010);
});

it('changeTotalSupply:verifies the functionality of updating the variable totalAllocatedTokens -- fails called by other than crowdfund',
async() => {
    let token = await SPCToken.new(crowdSaleAddress,{from:owner});
    try {
        await token.changeTotalSupply(new BigNumber(10).times(new BigNumber(10).pow(18)), {from: accounts[8]});
    } catch (error) {
        return Utils.ensureException(error);
    }
});

});