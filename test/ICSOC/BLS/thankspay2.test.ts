import { Signer } from "ethers";

const { expect } = require("chai");
var fs = require('fs');
var path = require('path');


let gasCosts: any = [];

async function calculateGasCost(tx) {
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * 1;
    //const gasPrice = (await tx.getTransaction()).gasPrice;
    return gasUsed;
}

async function createAndExecuteBatch(thanksPay, batcher, owner, func, paramsList, signerList) {
    const txDataPromises = paramsList.map((params) => func(...params));
    const txDataArray = await Promise.all(txDataPromises);
    const contractAddrs = thanksPay.address;
    const encodedTransactions = txDataArray.map((tx) => tx.data);

    let hash;

    const signedDataPromises = txDataArray.map(async (txData, index) => {
        hash = ethers.utils.solidityKeccak256(['bytes'], [txData.data]);
        const signer = signerList[index];
        const signature = await signer.signMessage(ethers.utils.arrayify(hash));
        return signature;
    });

    const sigs = await Promise.all(signedDataPromises);
    const tx = await batcher.connect(owner).executeTransactions(contractAddrs, encodedTransactions, sigs);
    const receipt = await tx.wait();

    return {
        gasUsed: receipt.gasUsed,
        hash: hash,
    };
}

async function enrollInBatcher(batcher, accounts) {
    const enrollPromises = accounts.map((account) => {
        return batcher.connect(account).enroll(account.address);
    });
    await Promise.all(enrollPromises);

    const throwAwayAccounts = await Promise.all(
        accounts.map((account) => batcher.throwawayAccounts(account.address))
    );

    return throwAwayAccounts;
}


describe("ThanksPay Test 2", function () {
    let Batcher, batcher: any, ThanksPay, thanksPay: any, creditPointsToken, owner: Signer, addr1: Signer, addr2: Signer, addr3: Signer, addr4: Signer, addr5: Signer, addrsRand: Signer, addrs: Signer;

    let gas1, gas2;
    beforeEach(async function () {
        this.timeout(0);
        const CreditPointsToken = await ethers.getContractFactory("ERC20Mock");
        creditPointsToken = await CreditPointsToken.deploy(1000000000000);
        await creditPointsToken.deployed();

        ThanksPay = await ethers.getContractFactory("ThanksPay");
        thanksPay = await ThanksPay.deploy(creditPointsToken.address);
        await thanksPay.deployed();

        let hash = ethers.utils.solidityKeccak256(['uint256'], [1]);

        Batcher = await ethers.getContractFactory("Batcher");
        batcher = await Batcher.deploy();
        await batcher.deployed();

        [owner, addr1, addr2, addr3, addr4, addr5, ...addrsRand] = await ethers.getSigners();

        const randomSigners = async (amount: number): Promise<Signer[]> => {
            const signers: Signer[] = []
            for (let i = 0; i < amount; i++) {
                let wallet = ethers.Wallet.createRandom();
                wallet = wallet.connect(ethers.provider);
                await owner.sendTransaction({ to: wallet.address, value: ethers.utils.parseEther('1') })
                signers.push(wallet);
            }
            return signers
        }
        [...addrs] = await randomSigners(90);
    });

    it("tests each function separately with their individual gas costs", async function () {
        this.timeout(0);
        // Enroll Company A
        let companyAInitialChargeableBalance = ethers.utils.parseEther("100");
        let tx1 = await thanksPay.connect(owner).enrollPartnerCompany(addr1.address, 30, companyAInitialChargeableBalance);
        let cost1 = await calculateGasCost(tx1);
        console.log("Gas cost for enrolling a company:", cost1);

        // Enroll Worker1 and assign to Company A
        let worker1MonthlySalary = ethers.utils.parseEther("5");
        let tx2 = await thanksPay.connect(owner).enrollWorker(addrs[0].address, addr1.address, worker1MonthlySalary);
        let cost2 = await calculateGasCost(tx2);
        console.log("Gas cost for enrolling a worker:", cost2);

        // Request Salary Advance for Worker1 (2 ETH)
        let advanceAmount = ethers.utils.parseEther("2");
        let tx3 = await thanksPay.connect(addrs[0]).requestSalaryAdvance(advanceAmount);
        let cost3 = await calculateGasCost(tx3);
        console.log("Gas cost for requesting salary advance:", cost3);

        // Increase Chargeable Balance (Company A): 50 ETH
        let topUpAmount = ethers.utils.parseEther("50");
        let owedServiceFees = await thanksPay.serviceFeePoints(addr1.address);
        let totalAmount = topUpAmount.add(owedServiceFees);
        let tx4 = await thanksPay.connect(addr1).increaseChargeableBalance(addr1.address, totalAmount);
        let cost4 = await calculateGasCost(tx4);
        console.log("Gas cost for increasing chargeable balance:", cost4);

        // Reset withdrawable balance for Worker1 on the salary day
        let tx5 = await thanksPay.connect(owner).salaryDay([addrs[0].address]);
        let cost5 = await calculateGasCost(tx5);
        console.log("Gas cost for resetting withdrawable balance on salary day:", cost5);
    });

    const runs = [...Array(89).keys()];

    runs.forEach((i, d) => {
        it("Batch execution with size " + i, async function () {
            this.timeout(0);
            const numCompanies = i;
            const numWorkers = i;

            // Divide public accounts into owner, companies, and workers
            const ownerAccount = owner;
            const companyAccounts = addrs.slice(0, numCompanies);
            const workerAccounts = addrs.slice(numCompanies, numCompanies + numWorkers);

            // Enroll all accounts in the Batching service and get their ThrowawayAccounts
            const allAccounts = [ownerAccount, ...companyAccounts, ...workerAccounts];
            const throwAwayAccounts = await enrollInBatcher(batcher, allAccounts);

            // Separate ThrowawayAccounts into owner, companies, and workers
            const throwAwayOwner = throwAwayAccounts[0];
            const throwAwayCompanies = throwAwayAccounts.slice(1, numCompanies + 1);
            const throwAwayWorkers = throwAwayAccounts.slice(numCompanies + 1);

            // Batches for each function
            const batches = [
                {
                    name: "enrollPartnerCompany",
                    func: thanksPay.populateTransaction.enrollPartnerCompany,
                    paramsList: throwAwayCompanies.map((account, index) => [
                        account,
                        30,
                        ethers.utils.parseEther((100).toString()),
                    ]),
                    signerList: Array(numCompanies).fill(ownerAccount),
                },
                {
                    name: "enrollWorker",
                    func: thanksPay.populateTransaction.enrollWorker,
                    paramsList: throwAwayWorkers.map((worker, index) => [
                        worker,
                        throwAwayCompanies[index],
                        ethers.utils.parseEther((5).toString()),
                    ]),
                    signerList: Array(numWorkers).fill(ownerAccount),
                },
                {
                    name: "requestSalaryAdvance",
                    func: thanksPay.populateTransaction.requestSalaryAdvance,
                    paramsList: throwAwayWorkers.map((_, index) => [
                        ethers.utils.parseEther((2).toString()),
                    ]),
                    signerList: workerAccounts,
                },
                {
                    name: "increaseChargeableBalance",
                    func: thanksPay.populateTransaction.increaseChargeableBalance,
                    paramsList: throwAwayCompanies.map((company, index) => [
                        company,
                        ethers.utils.parseEther((50 + index * 10).toString()),
                    ]),
                    signerList: companyAccounts,
                },
                {
                    name: "salaryDay",
                    func: thanksPay.populateTransaction.salaryDay,
                    paramsList: throwAwayWorkers.map((worker) => [
                        [worker],
                    ]),
                    signerList: Array(numWorkers).fill(ownerAccount),
                },
            ];
            gasCosts.push({
                "size": i
            })

            // Execute batches
            for (const batch of batches) {
                try {
                    let gasUsed: any = 0;
                    const response = await createAndExecuteBatch(thanksPay, batcher, owner, batch.func, batch.paramsList, batch.signerList);
                    gasUsed = response.gasUsed;
                    gasCosts[gasCosts.length - 1][batch.name] = gasUsed / i;
                    const gasCost = gasUsed / i;
                    console.log(`Gas used for batch execution of ${batch.func.name}:`, Math.round(gasCost));
                } catch (e) {
                    console.log(e);
                }
            }

            console.log("Finished processing batch of size " + i);

            var jsonPath = path.join(__dirname, './data.json');

            fs.writeFile(jsonPath, JSON.stringify(gasCosts), function (err: any) {
                if (err) {
                    console.log(err);
                }
            });

        });
    })
});