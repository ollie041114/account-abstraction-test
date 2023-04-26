// import { Create2Factory } from '../src/Create2Factory'
import { ethers } from 'hardhat'
import { expect } from 'chai'
// import { TestToken__factory, Batcher, ThrowawayAccount, TestContract } from '../typechain-types'
import { Provider } from '@ethersproject/providers'


// Test using ethers.js and Hardhat
describe("Batcher interaction with ThrowawayAccount and Test contracts", function () {
  let Batcher: any, ThrowawayAccount: any, TestContract: any;
  let owner: any;
  let txDataList: any, userAddrs: any, contractAddrs: any;
  let txNumber = 20;

  beforeEach(async () => {
    // Compile and deploy the three contracts
    const BatcherFactory = await ethers.getContractFactory("Batcher");
    Batcher = await BatcherFactory.deploy();

    const ThrowawayAccountFactory = await ethers.getContractFactory("ThrowawayAccount");
    ThrowawayAccount = await ThrowawayAccountFactory.deploy(Batcher.address);

    const TestContractFactory = await ethers.getContractFactory("TestContract");
    TestContract = await TestContractFactory.deploy();

    [owner] = await ethers.getSigners();


    await Batcher.deployed();
    await ThrowawayAccount.deployed();
    await TestContract.deployed();

    contractAddrs = new Array(txNumber).fill(TestContract.address);
    userAddrs = new Array(txNumber).fill(owner.address);

    // Create function selector for incrementTest() function
    const funcSelector = TestContract.interface.getSighash("incrementTest");
    // Encode transactions
    const tx = await Batcher.encodeTransactions([funcSelector], [[]]);
    txDataList = new Array(txNumber).fill(tx[0]);
  });

  it("Tests the interactions", async function () {
    // Enroll owner
    await Batcher.enroll(owner.address);



    // Generate the hashed message for signing
    const batcherNonce = 1;
    
        // Calculate the message hash using Solidity-compatible keccak256 encoding
    const messageHash = ethers.utils.solidityKeccak256(['bytes', 'uint256'], [txDataList[0], batcherNonce]);

    console.log("The message hash sent in JS is: ", messageHash);

    // Sign the message hash
    const signature = await owner.signMessage(ethers.utils.arrayify(messageHash));
    const signatures = Array(txNumber).fill(signature);

    console.log(contractAddrs, txDataList, batcherNonce, signatures);

    console.log(await await Batcher.estimateGas.executeTransactions(contractAddrs, txDataList, batcherNonce, signatures)/txNumber);

    // Execute transactions
    const tx = await Batcher.executeTransactions(contractAddrs, txDataList, batcherNonce, signatures);

    const receipt = await tx.wait();
    const gas = Number(receipt.gasUsed.toString());
    console.log("Gas Used by Transaction:", gas/txNumber);

    // Check if test variable is incremented
    // expect(await TestContract.test()).to.equal(1);
  });
});



// describe.only('test Create2Factory', () => {
//   let factory: Create2Factory
//   let provider: Provider
//   before(async () => {
//     provider = ethers.provider
//     factory = new Create2Factory(provider)
//   })
//   it('should deploy the factory', async () => {
//     expect(await factory._isFactoryDeployed()).to.equal(false, 'factory exists before test deploy')
//     await factory.deployFactory()
//     expect(await factory._isFactoryDeployed()).to.equal(true, 'factory failed to deploy')
//   })

//   it('should deploy to known address', async () => {
//     const initCode = TestToken__factory.bytecode

//     const addr = Create2Factory.getDeployedAddress(initCode, 0)

//     expect(await provider.getCode(addr).then(code => code.length)).to.equal(2)
//     await factory.deploy(initCode, 0)
//     expect(await provider.getCode(addr).then(code => code.length)).to.gt(100)
//   })
//   it('should deploy to different address based on salt', async () => {
//     const initCode = TestToken__factory.bytecode

//     const addr = Create2Factory.getDeployedAddress(initCode, 123)

//     expect(await provider.getCode(addr).then(code => code.length)).to.equal(2)
//     await factory.deploy(initCode, 123)
//     expect(await provider.getCode(addr).then(code => code.length)).to.gt(100)
//   })
// })
