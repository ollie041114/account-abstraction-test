import { ethers } from 'hardhat'
import { expect } from 'chai'


describe("HashBatcher", () => {
    let HashBatcherFactory, TestContractFactory, ThrowawayAccountFactory;
    let hashBatcher: any, testContract: any, throwawayAccount, owner: any;
    let passwordHashes: any, contractAddrs: any, encodedRandomInteger;
    let hashAccumulator, userAddrs: any, txDataList: any;

    let initGas: any;

    let txNumber = 20;
    beforeEach(async () => {

        // Deploy the contracts
        HashBatcherFactory = await ethers.getContractFactory("IndividualHashBatcher");
        hashBatcher = await HashBatcherFactory.deploy();

        TestContractFactory = await ethers.getContractFactory("TestContract");
        testContract = await TestContractFactory.deploy();

        ThrowawayAccountFactory = await ethers.getContractFactory("ThrowawayAccount");

        await hashBatcher.deployed();
        await testContract.deployed();

        [owner] = await ethers.getSigners();

        // Enroll the user(owner) and get the respective ThrowawayAccount's address
        await hashBatcher.enroll(owner.address);
        const throwawayAccountAddr = await hashBatcher.throwawayAccounts(owner.address);
        throwawayAccount = ThrowawayAccountFactory.attach(throwawayAccountAddr);

        // Initialize user hashes, contract addresses, and transactions
        const randomInteger = 1;
        const encodedValue = ethers.utils.solidityPack(["uint256"], [randomInteger]);
        const hashedValue = ethers.utils.keccak256(encodedValue);

        passwordHashes = new Array(txNumber).fill(hashedValue);
        contractAddrs = new Array(txNumber).fill(testContract.address);
        userAddrs = new Array(txNumber).fill(owner.address);

        // hashAccumulator = await hashBatcher.hashRandomInteger();

        // Create function selector for setTest(uint256) function;

        const funcSelector = testContract.interface.getSighash("incrementTest");
        const args = [[]];

        // Encode transactions
        const tx = await hashBatcher.encodeTransactions([funcSelector], args);

        txDataList = new Array(txNumber).fill(tx[0]);

        console.log(passwordHashes, txDataList, userAddrs);
    });

    it("should execute transactions when the recovered hash matches", async () => {

        let userHashes: any[] = [];
        for (let i = 0; i < txDataList.length; i++) {
            userHashes.push(
                ethers.utils.keccak256(
                    ethers.utils.solidityPack(["bytes", "bytes32"],
                        [txDataList[i], passwordHashes[i]])
                )
            );
        }

        // Batcher sets the final hash
        const initTx = await hashBatcher.connect(owner).setBatcherHash(userHashes, userAddrs);
        const initReceipt = await initTx.wait();
        const initGas = Number(initReceipt.gasUsed.toString());

        // Execute transactions
        const initialTestValue = await testContract.test();
        const tx = await hashBatcher
            .connect(owner)
            .executeTransactions(userAddrs, contractAddrs, txDataList, passwordHashes);

        const receipt = await tx.wait();

        const gas = Number(receipt.gasUsed.toString());

        console.log("Gas is:", (initGas + gas) / txNumber);

        // Verify the batcher's hash is reset after execution
        // expect(await hashBatcher.batcherHash(owner.address)).to.equal(ethers.constants.HashZero);

        // Verify that the testContract's value has increased by the number of executed transactions
        const finalTestValue = await testContract.test();
        expect(finalTestValue).to.equal(initialTestValue.add(txNumber));
    });
});