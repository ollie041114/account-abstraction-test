import { ethers } from "hardhat";
import { expect } from "chai";

describe.only("Batcher interaction with and Test contracts", function () {
    let Batcher: any, BatcherClassic: any, TestContract;
    let owner: any, user: any;
    let txDataList: any, userAddrs, contractAddrs: any;
    let txNumber = 20;

    beforeEach(async () => {
        // Compile and deploy the three contracts
        const BatcherFactory = await ethers.getContractFactory("BatcherAccountable");
        Batcher = await BatcherFactory.deploy();

        const BatcherClassicFactory = await ethers.getContractFactory("Batcher");
        BatcherClassic = await BatcherClassicFactory.deploy();

        const TestContractFactory = await ethers.getContractFactory("TestContract");
        TestContract = await TestContractFactory.deploy();

        [owner, user] = await ethers.getSigners();

        await Batcher.deployed();
        await BatcherClassic.deployed();
        await TestContract.deployed();

        contractAddrs = TestContract.address;
        userAddrs = new Array(txNumber).fill(owner.address);

        // Create function selector for incrementTest() function
        const funcSelector = TestContract.interface.getSighash("incrementTest");
        // Encode transactions
        const tx = await Batcher.encodeTransactions([funcSelector], [[]]);
        txDataList = new Array(txNumber).fill(tx[0]);
    });

    it("Tests the interaction in the Batcher", async function () {
        this.timeout(0);

        // Enroll owner and user
        await Batcher.enroll(owner.address);
        await Batcher.enroll(user.address);

        // Enroll owner and user in BatcherClassic
        await BatcherClassic.enroll(owner.address);
        await BatcherClassic.enroll(user.address);

        // User proposes transactions
        const batcherNonce = 0;
        const txNonces = Array.from({ length: txNumber }, (_, i) => i);
        const messageHashes = txNonces.map((txNonce) =>
            ethers.utils.solidityKeccak256(["bytes", "uint256", "uint256"], [txDataList[0], batcherNonce, txNonce])
        );

        // Owner signs the transactions
        const signatures = await Promise.all(messageHashes.map((msgHash) => owner.signMessage(ethers.utils.arrayify(msgHash))));

        // Owner sends the transactions
        const tx = await Batcher.connect(owner).executeTransactions(contractAddrs, txDataList, signatures, batcherNonce);
        const receipt = await tx.wait();

        console.log("Batcher gas used per transaction:", receipt.gasUsed.toNumber() / txNumber);

        // User opens a dispute for the first transaction
        await Batcher.connect(user).openDispute(txDataList[0], 0, 0, signatures[0], { value: ethers.utils.parseEther("0.5") });

        // Owner resolves the dispute successfully
        await Batcher.resolveDispute(txDataList, user.address);

        // Check if dispute is removed
        expect((await Batcher.disputes(user.address)).timestamp).to.equal(0);
    });

    it("Tests the interaction in the Batcher Classic", async function () {
        this.timeout(0);
        
        // Enroll owner and user in BatcherClassic
        await BatcherClassic.enroll(owner.address);
        await BatcherClassic.enroll(user.address);

        // User proposes transactions
        const messageHashes = txDataList.map((txData: any) => ethers.utils.solidityKeccak256(["bytes"], [txData]));

        // User signs the transactions
        const signatures = await Promise.all(messageHashes.map((msgHash: any) => user.signMessage(ethers.utils.arrayify(msgHash))));

        // Owner sends the transactions
        const tx2 = await BatcherClassic.connect(owner).executeTransactions(contractAddrs, txDataList, signatures);
        const receipt2 = await tx2.wait();

        console.log("Batcher Classic gas used per transaction:", receipt2.gasUsed.toNumber() / txNumber);
    });
});