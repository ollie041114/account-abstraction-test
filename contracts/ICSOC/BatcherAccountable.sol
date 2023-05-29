pragma solidity ^0.8.12;
pragma experimental ABIEncoderV2;

import "./ThrowAwayAccount.sol";
import "hardhat/console.sol";

contract BatcherAccountable {
    event GET(uint256, uint256, uint256, uint256, uint256, uint256, uint256);

    address private _throwawayAccount;
    address private _owner;

    constructor() {
        _owner = msg.sender;
    }

    mapping(address => address) public throwawayAccounts;
    mapping(uint256 => bytes32) public batchHashes;
    uint256 public currentBatchNonce;

    // Dispute struct
    struct Dispute {
        uint256 nonceId;
        bytes txData;
        uint256 timestamp;
    }

    // Dispute mapping
    mapping(address => Dispute) public disputes;

    function enroll(address enrollee) public {
        // Ensure there isn't already a ThrowawayAccount for this msgSender

        // Create a new ThrowawayAccount for this msgSender
        ThrowawayAccount throwawayAccountInstance = new ThrowawayAccount(
            address(this)
        );

        // Store the throwawayAccount address in the mapping
        throwawayAccounts[enrollee] = address(throwawayAccountInstance);
    }

    function encodeTransactions(
        bytes4[] memory funcHashs,
        uint256[][] memory args
    ) public view returns (bytes[] memory) {
        uint256 length = funcHashs.length;
        bytes[] memory txArray = new bytes[](length);

        for (uint256 i = 0; i < length; ++i) {
            txArray[i] = abi.encodeWithSelector(
                funcHashs[i],
                msg.sender,
                args[i]
            );
        }
        return txArray;
    }

    function executeTransactions(
        address contractAddr,
        bytes[] calldata txArray,
        bytes[] calldata sigs,
        uint256 batchNonce
    ) public {
        address msgSender;
        bytes32 Msg;
        for (uint256 i = 0; i < txArray.length; ++i) {
            Msg = keccak256(abi.encodePacked(txArray[i], batchNonce, i));
            msgSender = verify(Msg, sigs[i]);
            address throwawayAccountAddr = throwawayAccounts[msgSender];

            bool success = ThrowawayAccount(throwawayAccountAddr)
                .executeTransaction(contractAddr, txArray[i]);
            require(success, "Transaction execution failed");
        }
        batchHashes[batchNonce] = keccak256(abi.encode(txArray));
        // currentBatchNonce = batchNonce;
    }

    function openDispute(
        bytes calldata txData,
        uint256 nonceId,
        uint256 batchId,
        bytes calldata ownerSignature
    ) public payable {
        require(msg.value == 0.5 ether, "Must send 0.5 ETH to open a dispute");
        require(batchId == currentBatchNonce, "Invalid batchId for dispute");
        require(
            verify(
                keccak256(abi.encodePacked(txData, nonceId, batchId)),
                ownerSignature
            ) == _owner,
            "Invalid owner signature"
        );

        disputes[msg.sender] = Dispute(nonceId, txData, block.timestamp);
    }

    function resolveDispute(
        bytes[] calldata txDataArray,
        address disputee
    ) public {
        require(msg.sender == _owner, "Only the owner can resolve disputes");
        Dispute memory dispute = disputes[disputee];

        uint256 nonceId = dispute.nonceId;
        bytes memory txData = dispute.txData;

        require(
            keccak256(abi.encodePacked(txDataArray[nonceId])) ==
                keccak256(abi.encodePacked(txData)),
            "txData does not match"
        ); 
        require(
            keccak256(abi.encode(txDataArray)) == batchHashes[currentBatchNonce]
        );
        delete disputes[disputee];
    }

    function claimDisputeCompensation() public {
        Dispute memory dispute = disputes[msg.sender];
        require(dispute.timestamp != 0, "No dispute found");
        require(
            block.timestamp >= dispute.timestamp + 1 days,
            "Must wait 1 day after opening the dispute"
        );

        payable(msg.sender).transfer(1 ether);
        delete disputes[msg.sender];
    }

    function verify(
        bytes32 msgHash,
        bytes memory sig
    ) public pure returns (address) {
        require(sig.length == 65);
        bytes32 r;
        bytes32 s;
        uint8 v;

        bytes memory hashPrefix = "\x19Ethereum Signed Message:\n32";
        msgHash = keccak256(abi.encodePacked(hashPrefix, msgHash));

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "Invalid signature 'v' value");
        return ecrecover(msgHash, v, r, s);
    }
}
