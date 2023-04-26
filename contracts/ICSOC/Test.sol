// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

contract TestContract {
    uint256 public test;

    constructor() {
        test = 0;
    }

    function incrementTest() public {
        test += 1;
    }

    function viewTest() public view returns (uint256) {
        return test;
    }
}