// SPDX-License-Identifier: GPL-3.0
import "hardhat/console.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
pragma solidity ^0.8.12;

contract TestContract is ERC2771Context {
    uint256 public test;

    constructor(address relayer) ERC2771Context(relayer) {
        test = 0;
    }

    function incrementTest(uint256 number) public {
        console.log("Address in solidity");
        console.logAddress(_msgSender());
        console.log(number);
        test += 1;
    }

    function viewTest() public view returns (uint256) {
        return test;
    }
}

contract batcher {
    event GET(uint256, uint256, uint256, uint256, uint256, uint256, uint256);

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

    function dispatch(
        address[] calldata contractAddrs,
        bytes[] calldata args,
        bytes[] calldata sigs
    ) public {
        address msgSender;
        bytes32 msgHash;
        for (uint i = 0; i < contractAddrs.length; i++) {
            msgHash = keccak256(abi.encodePacked(contractAddrs[i], args[i]));
            msgSender = verify(msgHash, sigs[i]);
            console.log("msgSender in dispatch");
            console.log(msgSender);

            (bool success, ) = contractAddrs[i].call(
                abi.encodePacked(args[i], msgSender)
            );
            require(success, "Stuff");
        }
    }
}
