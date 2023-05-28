import "hardhat/console.sol";

// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

contract ThrowawayAccount {
    address public owner;

    constructor(address _owner) {
        owner = _owner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    function executeTransaction(
        address contractAddr,
        bytes calldata txData
    ) public onlyOwner returns (bool) {
        (bool success, ) = contractAddr.call(txData);

        // Return true if the call was successful, false otherwise
        return success;
    }
}
