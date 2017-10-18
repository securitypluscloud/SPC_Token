pragma solidity ^0.4.15;

import './helpers/BasicToken.sol';
import './lib/safeMath.sol';

contract SPCToken is BasicToken {

using SafeMath for uint256;

string public name = "SecurityPlusCloud Token";              //name of the token
string public symbol = "SPC";                                // symbol of the token
uint8 public decimals = 18;                                  // decimals
uint256 public totalSupply = 500000000 * 10**18;             // total supply of SPC Tokens  

// variables
uint256 public keyEmployeesAllocation;              // fund allocated to key employees 
uint256 public bountiesAllocation;                  // fund allocated to advisors 
uint256 public longTermBudgetAllocation;            // fund allocated to Market 
uint256 public bonusAllocation;                     // funds allocated to founders that in under vesting period
uint256 public totalAllocatedTokens;                // variable to keep track of funds allocated
uint256 public tokensAllocatedToCrowdFund;          // funds allocated to crowdfund

// addresses
// multi sign address of founders which hold 
address public founderMultiSigAddress = 0x70b0ea058aee845342B09f1769a2bE8deB46aA86;     
address public crowdFundAddress;                    // address of crowdfund contract
address public owner;                               // owner of the contract
// bonus funds get allocated to below address
address public bonusAllocAddress = 0x95817119B58D195C10a935De6fA4141c2647Aa56;
// Address to allocate the bounties
address public bountiesAllocAddress = 0x6272A7521c60dE62aBc048f7B40F61f775B32d78;
// Address to allocate the LTB
address public longTermbudgetAllocAddress = 0x00a6858fe26c326c664a6B6499e47D72e98402Bb;

//events

event ChangeFoundersWalletAddress(uint256  _blockTimeStamp, address indexed _foundersWalletAddress);

//modifiers

  modifier onlyCrowdFundAddress() {
    require(msg.sender == crowdFundAddress);
    _;
  }

  modifier nonZeroAddress(address _to) {
    require(_to != 0x0);
    _;
  }

  modifier onlyFounders() {
    require(msg.sender == founderMultiSigAddress);
    _;
  }


  
   // creation of the token contract 
   function SPCToken (address _crowdFundAddress) {
    owner = msg.sender;
    crowdFundAddress = _crowdFundAddress;

    // Token Distribution 
    keyEmployeesAllocation = 50 * 10 ** 24;           // 10 % allocation of totalSupply 
    bountiesAllocation = 35 * 10 ** 24;               // 7 % allocation of totalSupply 
    tokensAllocatedToCrowdFund = 25 * 10 ** 25;       // 50 % allocation of totalSupply
    longTermBudgetAllocation = 10 * 10 ** 25;         // 20 % allocation of totalSupply
    bonusAllocation = 65 * 10 ** 24;                  // 13 % allocation of totalSupply

    // Assigned balances to respective stakeholders
    balances[founderMultiSigAddress] = keyEmployeesAllocation;
    balances[crowdFundAddress] = tokensAllocatedToCrowdFund;
    balances[bonusAllocAddress] = bonusAllocation;
    balances[bountiesAllocAddress] = bountiesAllocation;
    balances[longTermbudgetAllocAddress] = longTermBudgetAllocation;

    totalAllocatedTokens = balances[founderMultiSigAddress] + balances[bonusAllocAddress] + balances[bountiesAllocAddress] + balances[longTermbudgetAllocAddress];
  }

// function to keep track of the total token allocation
  function changeTotalSupply(uint256 _amount) onlyCrowdFundAddress {
    totalAllocatedTokens += _amount;
  }

// function to change founder multisig wallet address            
  function changeFounderMultiSigAddress(address _newFounderMultiSigAddress) onlyFounders nonZeroAddress(_newFounderMultiSigAddress) {
    founderMultiSigAddress = _newFounderMultiSigAddress;
    ChangeFoundersWalletAddress(now, founderMultiSigAddress);
  }


// fallback function to restrict direct sending of ether
  function () {
    revert();
  }

}