pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./ThrowAwayAccount.sol";


contract IndividualHashBatcher {
    // mapping(address => bytes32) public batcherHash;
    mapping(address => bytes32) public userHash;
    mapping(address => address) public throwawayAccounts;

    function setBatcherHash(bytes32[] calldata userHashes, address[] calldata userAddrs) external {
        // require(_hashes.length > 0, "Hashes array is empty");

        for (uint256 i = 0; i < userHashes.length; ++i) {
            userHash[userAddrs[i]] = userHashes[i];
        }
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

    function executeTransactions(
        address[] calldata userAddresses,
        address[] calldata contractAddrs,
        bytes[] calldata txDataList,
        bytes32[] calldata passwordHashes
    ) external {
        // require(batcherHash[msg.sender] != bytes32(0), "Invalid batcher hash");

        for (uint256 i = 0; i < contractAddrs.length; i++) {

            bytes32 finalHash = userHash[userAddresses[i]];
            bytes32 hash = keccak256(abi.encodePacked(txDataList[i], passwordHashes[i]));

            require(finalHash == hash, "Recovered hash doesn't match");

            address throwawayAccountAddr = throwawayAccounts[userAddresses[i]];
            require(throwawayAccountAddr != address(0), "User not enrolled");

            ThrowawayAccount throwawayAccountInstance = ThrowawayAccount(throwawayAccountAddr);
            bool success = throwawayAccountInstance.executeTransaction(contractAddrs[i], txDataList[i]);
            require(success, "Transaction execution failed");
        }

        // batcherHash[msg.sender] = bytes32(0);
    }
}