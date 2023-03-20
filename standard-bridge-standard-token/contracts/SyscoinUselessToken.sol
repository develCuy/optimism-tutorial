// contracts/SUT1.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SUT1 is ERC20, Ownable {

    constructor() ERC20("SyscoinUselessToken-1", "SUT1") {
        _mint(msg.sender, 1000000 ether);
    }

    function increaseSupply(uint256 amount) public onlyOwner {
        _mint(owner(), amount);
    }

    function faucet() public {
        _mint(msg.sender, 1 ether);
    }
}