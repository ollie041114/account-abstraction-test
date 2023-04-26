pragma solidity ^0.8.12;
pragma experimental ABIEncoderV2;

import "./ThrowAwayAccount.sol";
import "hardhat/console.sol";


contract Batcher {
    event GET(uint256, uint256, uint256, uint256, uint256, uint256, uint256);

    address private _throwawayAccount;

    constructor() {
        // _throwawayAccount = throwawayAccount;
    }

        // Mapping to store each account's unique ThrowawayAccount
    mapping(address => address) public throwawayAccounts;

    function enroll(address enrollee) public {
        // Ensure there isn't already a ThrowawayAccount for this msgSender
        // require(throwawayAccounts[msg.sender] == address(0), "Already enrolled");

        // Create a new ThrowawayAccount for this msgSender
        ThrowawayAccount throwawayAccountInstance = new ThrowawayAccount(address(this));

        // Store the throwawayAccount address in the mapping
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

        // The updated `dispatch` function, now named `executeTransactions`
    function executeTransactions(
        address[] memory contractAddrs,
        bytes[] memory txArray,
        uint256 batchernonce, 
        bytes[] memory sigs
        ) public {
        address msgSender;
        bytes32 msgHash;
        // Enforce the msgSender has a ThrowawayAccount
        // require(throwawayAccounts[msg.sender] != address(0), "The dispatcher needs to be enrolled");

        for (uint256 i = 0; i < txArray.length; ++i) {
            msgHash = keccak256(abi.encodePacked(txArray[i], batchernonce));


            msgSender = verify(msgHash, sigs[i]);

            address throwawayAccountAddr = throwawayAccounts[msgSender];


            bool success = ThrowawayAccount(throwawayAccountAddr).executeTransaction(contractAddrs[i], txArray[i]);
            require(success, "Transaction execution failed");
        }
    }

    function verify(bytes32 msgHash, bytes memory sig) public pure returns (address) {
        require(sig.length == 65);
        bytes32 r;
        bytes32 s;
        uint8 v;

        bytes memory hashPrefix = "\x19Ethereum Signed Message:\n32";
        msgHash = keccak256(abi.encodePacked(hashPrefix, msgHash));

        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "Invalid signature 'v' value");

        return ecrecover(msgHash, v, r, s);
    }

    // function dispatch(
    //     address[] memory contractAddrs,
    //     bytes32[] memory funcHashs,
    //     uint256[][] memory args,
    //     uint256 batchernonce,
    //     bytes[] memory sigs
    // ) public {
    //     address msgSender;
    //     uint argsLen;
    //     bytes32 msgHash = keccak256(abi.encodePacked(contractAddrs, batchernonce));

    //     for (uint i = 0; i < contractAddrs.length; i++) {
    //         argsLen = args[i].length;
    //         msgSender = verify(msgHash, sigs[i]);

    //         address throwawayAccountAddr = throwawayAccounts[msgSender];

    //         // Call the ThrowawayAccount contract to execute the transaction
    //         (bool success, ) = throwawayAccountAddr.call(
    //             abi.encodeWithSelector(
    //                 ThrowawayAccount(_throwawayAccount).executeTransaction.selector,
    //                 contractAddrs[i],
    //                 bytes4(funcHashs[i]),
    //                 args[i]
    //             )
    //         );
    //         require(success, "Transaction execution failed");
    //     }
    // }
    // verify function and other contract functions remain unchanged
    // event GET(uint256, uint256, uint256, uint256, uint256, uint256, uint256);
}