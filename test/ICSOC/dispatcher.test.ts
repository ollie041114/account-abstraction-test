const { expect } = require("chai");


describe.only("Batcher Contract", function() {
  it("Can verify and dispatch", async function() {
    const Batcher = await ethers.getContractFactory("batcher");
    const batcher = await Batcher.deploy();
    await batcher.deployed();

    const TestContract = await ethers.getContractFactory("TestContract");
    const testContract = await TestContract.deploy(batcher.address);

    await testContract.deployed();

    // signing some data for the increment batch
    const signer = ethers.provider.getSigner();
    const tx = await testContract.populateTransaction.incrementTest(1);

    // const message = ethers.utils.arrayify(ethers.utils.id('incrementTest(uint256)1'));
    const message = ethers.utils.arrayify(ethers.utils.solidityKeccak256(
      ["address", "bytes"],
      [testContract.address, tx.data]
    ));

    const signature = await signer.signMessage(message);
    
    // Preparing arrays to send in the batch
    let addresses = [testContract.address];
    console.log("Address in JS:", tx.from);

    let args = [tx.data];
    let sigs = [signature];

    // dispatch calls
    await batcher.dispatch(addresses, args, sigs);

    // get the value and log to the console
    const value = await testContract.viewTest();
    console.log("Incremented Value: ", value.toString());
    
    // Check the result
    expect(await testContract.viewTest()).to.equal("1");
  });
});