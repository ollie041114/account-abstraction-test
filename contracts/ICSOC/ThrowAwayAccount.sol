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
        bytes memory txData
    ) public onlyOwner returns (bool) {
        // Forward the call to the target contract with API function hash and arguments
        (bool success, ) = contractAddr.call(txData);

        // Return true if the call was successful, false otherwise
        return success;
    }
}
