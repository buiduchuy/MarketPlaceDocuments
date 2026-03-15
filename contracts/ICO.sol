// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./StudyToken.sol";

contract ICO is Ownable {

    StudyToken public token;
    uint public rate = 1000;
    bool public icoActive = true;

    event TokenPurchased(address buyer, uint amount);

    constructor(address tokenAddress) Ownable(msg.sender) {
        token = StudyToken(tokenAddress);
    }

    function buyTokens() public payable {

        require(icoActive, "ICO ended");
        require(msg.value > 0, "Send ETH");

        uint amount = msg.value * rate;

        token.transfer(msg.sender, amount);

        emit TokenPurchased(msg.sender, amount);
    }

    function withdrawETH() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function endICO() public onlyOwner {
        icoActive = false;
    }
}