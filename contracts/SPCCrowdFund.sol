pragma solidity ^0.4.15;

import './lib/safeMath.sol';
import './SPCToken.sol';

contract SPCCrowdFund {

    using SafeMath for uint256;
    
    SPCToken public token;                                    // Token contract reference

    //variables
    uint256 public preSaleStartTime = 1509494401;             // Wednesday, 01-Nov-17 00:00:01 UTC     
    uint256 public preSaleEndTime = 1510531199;               // Sunday, 12-Nov-17 23:59:59 UTC           
    uint256 public crowdfundStartDate = 1511308801;           // Wednesday, 22-Nov-17 00:00:01 UTC
    uint256 public crowdfundEndDate = 1515283199;             // Saturday, 06-Jan-18 23:59:59 UTC
    uint256 public totalWeiRaised;                            // Counter to track the amount raised
    uint256 public exchangeRateForETH = 300;                  // No. of SOC Tokens in 1 ETH
    uint256 public exchangeRateForBTC = 4500;                 // No. of SPC Tokens in 1 BTC  
    uint256 internal tokenSoldInPresale = 0;
    uint256 internal tokenSoldInCrowdsale = 0;
    uint256 internal minAmount = 1 * 10 ** 17;                // Equivalent to 0.1 ETH

    bool internal isTokenDeployed = false;                    // Flag to track the token deployment -- only can be set once
 

     // addresses
    // Founders multisig address
    address public founderMultiSigAddress = 0xF50aCE12e0537111be782899Fd5c4f5f638340d5;                            
    // Owner of the contract
    address public owner;                                              
    
    enum State { PreSale, Crowdfund, Finish }

    //events
    event TokenPurchase(address indexed beneficiary, uint256 value, uint256 amount); 
    event CrowdFundClosed(uint256 _blockTimeStamp);
    event ChangeFoundersWalletAddress(uint256 _blockTimeStamp, address indexed _foundersWalletAddress);
   
    //Modifiers
    modifier tokenIsDeployed() {
        require(isTokenDeployed == true);
        _;
    }
    modifier nonZeroEth() {
        require(msg.value > 0);
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

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier onlyPublic() {
        require(msg.sender != founderMultiSigAddress);
        _;
    }

    modifier inState(State state) {
        require(getState() == state); 
        _;
    }

     // Constructor to initialize the local variables 
    function SPCCrowdFund () {
        owner = msg.sender;
    }

    // Function to change the founders multisig address 
     function setFounderMultiSigAddress(address _newFounderAddress) onlyFounders  nonZeroAddress(_newFounderAddress) {
        founderMultiSigAddress = _newFounderAddress;
        ChangeFoundersWalletAddress(now, founderMultiSigAddress);
    }

    // Attach the token contract, can only be done once     
    function setTokenAddress(address _tokenAddress) external onlyOwner nonZeroAddress(_tokenAddress) {
        require(isTokenDeployed == false);
        token = SPCToken(_tokenAddress);
        isTokenDeployed = true;
    }

    // function call after crowdFundEndTime.
    // It transfers the remaining tokens to remainingTokenHolder address
    function endCrowdfund() onlyFounders inState(State.Finish) returns (bool) {
        require(now > crowdfundEndDate);
        uint256 remainingToken = token.balanceOf(this);  // remaining tokens

        if (remainingToken != 0) 
          token.transfer(founderMultiSigAddress, remainingToken); 
          CrowdFundClosed(now);
          return true; 
    }

    // Buy token function call only in duration of crowdfund active 
    function buyTokens(address beneficiary) nonZeroEth tokenIsDeployed onlyPublic nonZeroAddress(beneficiary) payable returns(bool) {
        require(msg.value >= minAmount);

        if (getState() == State.PreSale) {
            if (buyPreSaleTokens(beneficiary)) {
                return true;
            }
            return false;
        } else {
            require(now >= crowdfundStartDate && now <= crowdfundEndDate);
            fundTransfer(msg.value);

            uint256 amount = getNoOfTokens(exchangeRateForETH, msg.value);
            
            if (token.transfer(beneficiary, amount)) {
                tokenSoldInCrowdsale = tokenSoldInCrowdsale.add(amount);
                token.changeTotalSupply(amount); 
                totalWeiRaised = totalWeiRaised.add(msg.value);
                TokenPurchase(beneficiary, msg.value, amount);
                return true;
            } 
            return false;
        }
       
    }
        
    // function to buy the tokens at presale 
    function buyPreSaleTokens(address beneficiary) internal returns(bool) {
            
            uint256 amount = getTokensForPreSale(exchangeRateForETH, msg.value);
            fundTransfer(msg.value);

            if (token.transfer(beneficiary, amount)) {
                tokenSoldInPresale = tokenSoldInPresale.add(amount);
                token.changeTotalSupply(amount); 
                totalWeiRaised = totalWeiRaised.add(msg.value);
                TokenPurchase(beneficiary, msg.value, amount);
                return true;
            }
            return false;
    }    

// function to calculate the total no of tokens with bonus multiplication
    function getNoOfTokens(uint256 _exchangeRate, uint256 _amount) internal constant returns (uint256) {
         uint256 noOfToken = _amount.mul(_exchangeRate);
         uint256 noOfTokenWithBonus = ((100 + getCurrentBonusRate()) * noOfToken ).div(100);
         return noOfTokenWithBonus;
    }

    function getTokensForPreSale(uint256 _exchangeRate, uint256 _amount) internal constant returns (uint256) {
        uint256 noOfToken = _amount.mul(_exchangeRate);
        uint256 noOfTokenWithBonus = ((100 + getCurrentBonusRate()) * noOfToken ).div(100);
        if (noOfTokenWithBonus + tokenSoldInPresale > (50000000 * 10 ** 18) ) {
            revert();
        }
        return noOfTokenWithBonus;
    }

    // function to transfer the funds to founders account
    function fundTransfer(uint256 weiAmount) internal {
        founderMultiSigAddress.transfer(weiAmount);
    }


// Get functions 

    // function to get the current state of the crowdsale
    function getState() public constant returns(State) {
        if (now >= preSaleStartTime && now <= preSaleEndTime) {
            return State.PreSale;
        }
        if (now >= crowdfundStartDate && now <= crowdfundEndDate) {
            return State.Crowdfund;
        } 
        return State.Finish;
    }


    // function provide the current bonus rate
    function getCurrentBonusRate() internal returns (uint8) {
        
        if (getState() == State.PreSale) {
           return 50;
        } 
        if (getState() == State.Crowdfund) {
           if (tokenSoldInCrowdsale <= (100000000 * 10 ** 18) ) {
               return 30;
           }
           if (tokenSoldInCrowdsale > (100000000 * 10 ** 18) && tokenSoldInCrowdsale <= (175000000 * 10 ** 18)) {
               return 10;
           } else {
               return 0;
           }
        }
    }


    // provides the bonus % 
    function currentBonus() public constant returns (uint8) {
        return getCurrentBonusRate();
    }

    // Crowdfund entry
    // send ether to the contract address
    // With at least 200 000 gas
    function() public payable {
        buyTokens(msg.sender);
    }
}