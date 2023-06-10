// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
pragma abicoder v2;

import {BLS} from "../lib/hubble-contracts/contracts/libs/BLS.sol";
import "./CustomAccount.sol";
import "../lib/BLSOpen.sol";
import {BLSOpen} from  "../lib/BLSOpen.sol";
import "../IBLSAccount.sol";
import "../BLSHelper.sol";


contract CustomBLS {
    using BLSOpen for uint256[2];
    using BLSOpen for uint256[4];

         //copied from BLS.sol
    uint256 public  constant N = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // EntryPoint public entryPoint;
    // BLSAccount public blsAccount;

    constructor() {
        // blsAccount = BLSAccount(_blsAccount);
    }

    function aggregateSignatures(bytes[] calldata signatures) external pure returns (bytes memory aggregatedSignature) {
        BLSHelper.XY[] memory points = new BLSHelper.XY[](signatures.length);
        for (uint i = 0; i < points.length; i++) {
            (uint256 x, uint256 y) = abi.decode(signatures[i], (uint256, uint256));
            points[i] = BLSHelper.XY(x, y);
        }
        BLSHelper.XY memory sum = BLSHelper.sum(points, N);
        return abi.encode(sum.x, sum.y);
    }

    function validateSignatures(
        uint256[4][] memory blsPublicKeys,
        uint256[2][] memory messages,
        bytes calldata signature
        ) external view {
        require(signature.length == 64, "BLS: invalid signature");
        (uint256[2] memory blsSignature) = abi.decode(signature, (uint256[2]));

        require(blsPublicKeys.length == messages.length, "Public keys and messages length mismatch");

        require(BLSOpen.verifyMultiple(blsSignature, blsPublicKeys, messages), "BLS: validateSignatures failed");
    }
}

// contract Batcher {
//     BLSSignatureAggregator private aggregator;

//     constructor(address _aggregator) {
//         aggregator = BLSSignatureAggregator(_aggregator);
//     }

//     function executeTransactions(
//         address[] memory contractAddrs,
//         bytes[] memory txArray,
//         uint256 batchernonce,
//         bytes[] memory signatures
//     ) public {
//         bytes memory aggregatedSignature = aggregator.aggregateSignatures(signatures);
//         aggregator.validateSignatures(signatures, aggregatedSignature);

//         for (uint256 i = 0; i < txArray.length; ++i) {
//             bool success = ThrowAwayAccount(contractAddrs[i]).executeTransaction(txArray[i]);
//             require(success, "Transaction execution failed");
//         }
//     }
// }