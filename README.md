Relevant stuffs:

### Smart contracts

**contracts/ICSOC/BatcherAccountable** - the current implementation of batcher supporting accountability
**contracts/ICSOC/ThanksayERC20** - the smart contract implementing ThanksPay logic

### Tests

**test/ICSOC/accountable2.test.ts** - enrolls users in batcher, invokes ThanksPayERC20, calculates gas costs for different batch sizes

**test/ICSOC/spolia.test.ts** - checks latency on the public network.

### TODOs

1. Obviously, somehow we need to unite it with the previously developed interface.

2. Somehow, we need to simulate users having a local machine, and having local private keys. Perhaps we could generate them in the browser.

3. Currently, we separately implement testing the gas costs of batching, and latency on the public network. In other words: local simulations are NOT batch-transferred to the actual public blockhcain. This has to be implemented somehow, like we did before.



<!-- Implementation of contracts for [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337) account abstraction via alternative mempool.




# Resources

[Vitalik's post on account abstraction without Ethereum protocol changes](https://medium.com/infinitism/erc-4337-account-abstraction-without-ethereum-protocol-changes-d75c9d94dc4a)

[Discord server](http://discord.gg/fbDyENb6Y9)

[Bundler reference implementation](https://github.com/eth-infinitism/bundler)

[Bundler specification test suite](https://github.com/eth-infinitism/bundler-spec-tests) -->
