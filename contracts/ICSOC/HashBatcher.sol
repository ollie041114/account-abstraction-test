pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./ThrowAwayAccount.sol";


contract HashBatcher {
    mapping(address => bytes32) public batcherHash;
    mapping(address => address) public throwawayAccounts;

    function setBatcherHash(bytes32 _hash) external {
        batcherHash[msg.sender] = _hash;
    }

    function enroll(address enrollee) public {
        require(throwawayAccounts[enrollee] == address(0), "Already enrolled");

        ThrowawayAccount throwawayAccountInstance = new ThrowawayAccount(address(this));
        throwawayAccounts[enrollee] = address(throwawayAccountInstance);
    }

    function encodeTransactions(bytes4[] memory funcHashs, uint256[][] memory args) public view returns (bytes[] memory) {
        uint256 length = funcHashs.length;
        bytes[] memory txArray = new bytes[](length);

        for (uint256 i = 0; i < length; ++i) {
            txArray[i] = abi.encodeWithSelector(funcHashs[i], msg.sender, args[i]);
        }

        return txArray;
    }

    function hashRandomInteger() public pure returns (bytes32) {
        uint256 randomInteger = 1;
        return keccak256(abi.encodePacked(randomInteger));
    }

    function executeTransactions(
        address[] calldata userAddresses,
        address[] calldata contractAddrs,
        bytes[] calldata txDataList,
        bytes32[] calldata userHashes
    ) external {
        require(batcherHash[msg.sender] != bytes32(0), "Invalid batcher hash");

        bytes32 finalHash = batcherHash[msg.sender];
        bytes32 hashAccumulator = hashRandomInteger();

        for (uint256 i = 0; i < contractAddrs.length; i++) {
            hashAccumulator = keccak256(
                abi.encodePacked(hashAccumulator, txDataList[i], contractAddrs[i], userHashes[i])
            );

            address throwawayAccountAddr = throwawayAccounts[userAddresses[i]];
            require(throwawayAccountAddr != address(0), "User not enrolled");

            ThrowawayAccount throwawayAccountInstance = ThrowawayAccount(throwawayAccountAddr);
            bool success = throwawayAccountInstance.executeTransaction(contractAddrs[i], txDataList[i]);
            require(success, "Transaction execution failed");
        }

        require(finalHash == hashAccumulator, "Recovered hash doesn't match");

        // for (uint256 i = 0; i < contractAddrs.length; i++) {
        //     address throwawayAccountAddr = throwawayAccounts[userAddresses[i]];
        //     require(throwawayAccountAddr != address(0), "User not enrolled");

        //     ThrowawayAccount throwawayAccountInstance = ThrowawayAccount(throwawayAccountAddr);
        //     bool success = throwawayAccountInstance.executeTransaction(contractAddrs[i], txDataList[i]);
        //     require(success, "Transaction execution failed");
        // }

        batcherHash[msg.sender] = bytes32(0);
    }
}