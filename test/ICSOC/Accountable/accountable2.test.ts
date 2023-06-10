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
        hash = ethers.utils.solidityKeccak256(['bytes', 'uint256', 'uint256'], [txData.data, 1, index]);
        const signer = signerList[index];
        const signature = await signer.signMessage(ethers.utils.arrayify(hash));
        return signature;
    });

    const sigs = await Promise.all(signedDataPromises);
    const tx = await batcher.connect(owner).executeTransactions(contractAddrs, encodedTransactions, sigs, 1);
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


let salaryAmount = ethers.utils.parseUnits("15", 18);
let mintAmount = ethers.utils.parseUnits("10", 18);
let burnAmount = ethers.utils.parseUnits("5", 18);

let hasRun = false;

describe.only("ThanksPay Test 2", function () {
    let Batcher, batcher: any, ThanksPay, thanksPay: any, creditPointsToken, owner: Signer, addr1: Signer, addr2: Signer, addr3: Signer, addr4: Signer, addr5: Signer, addrsRand: Signer, addrs: Signer;

    let gas1, gas2;
    beforeEach(async function () {
        this.timeout(0);

        ThanksPay = await ethers.getContractFactory("ThanksPaySalaryToken");
        thanksPay = await ThanksPay.deploy();
        await thanksPay.deployed();

        Batcher = await ethers.getContractFactory("BatcherAccountable");
        batcher = await Batcher.deploy();
        await batcher.deployed();

        [owner, addr1, addr2, addr3, addr4, addr5, ...addrsRand] = await ethers.getSigners();

        if (!hasRun) {

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
            [...addrs] = await randomSigners(200);
            hasRun = true;

            console.log("Getting new random signers ONLY ONCE!");
        }
    });


    it("tests each function separately with their individual gas costs", async function () {
        this.timeout(0);
        gasCosts.push({
            "size": 0
        });
        // Add Partner Company A
        let tx1 = await thanksPay.connect(owner).addPartnerCompany(addr1.address);
        let cost1 = await calculateGasCost(tx1);
        gasCosts[0]["addPartnerCompany"] = cost1;
        console.log("Gas cost for adding a partner company:", cost1);

        // Add Worker 1
        let tx2 = await thanksPay.connect(owner).addWorker(addrs[0].address);
        let cost2 = await calculateGasCost(tx2);
        gasCosts[0]["addWorker"] = cost2;
        console.log("Gas cost for adding a worker:", cost2);

        // Mint tokens for Worker 1 (10 TPS)
        let tx3 = await thanksPay.connect(addr1).mintTokens(addrs[0].address, mintAmount);
        let cost3 = await calculateGasCost(tx3);
        gasCosts[0]["mintTokens"] = cost3;
        console.log("Gas cost for minting tokens:", cost3);

        // Worker 1 burns tokens (5 TPS)
        let tx4 = await thanksPay.connect(addrs[0]).burnTokens(burnAmount, addr1.address);
        let cost4 = await calculateGasCost(tx4);
        gasCosts[0]["burnTokens"] = cost4;
        console.log("Gas cost for burning tokens:", cost4);

        // Salary day for Worker 1 (15 TPS)
        let tx5 = await thanksPay.connect(addr1).salaryDay([addrs[0].address], [salaryAmount]);
        let cost5 = await calculateGasCost(tx5);
        gasCosts[0]["settlePartnerDebt"] = cost5;
        console.log("Gas cost for salary day:", cost5);

        // Settle Partner Company A's debt
        let tx6 = await thanksPay.connect(owner).settlePartnerDebt(addr1.address);
        let cost6 = await calculateGasCost(tx6);
        gasCosts[gasCosts.length - 1]["settlePartnerDebt"] = cost6;
        console.log("Gas cost for settling partner company's debt:", cost6);
        

    });

    const runs = [...Array(89).keys()];

    runs.forEach((i, d) => {
        it("Batch execution with size " + i, async function () {
            this.timeout(0);
            const numCompanies = i + 1;
            const numWorkers = i + 1;

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

            console.log("Actual throwaway: throwAwayOwner");

            // Batches for each function
            const batches = [
                {
                    name: "addPartnerCompany",
                    func: thanksPay.populateTransaction.addPartnerCompany,
                    paramsList: throwAwayCompanies.map((account) => [
                        account,
                    ]),
                    signerList: Array(numCompanies).fill(ownerAccount),
                },
                {
                    name: "addWorker",
                    func: thanksPay.populateTransaction.addWorker,
                    paramsList: throwAwayWorkers.map((worker) => [
                        worker,
                    ]),
                    signerList: Array(numWorkers).fill(ownerAccount),
                },
                {
                    name: "mintTokens",
                    func: thanksPay.populateTransaction.mintTokens,
                    paramsList: throwAwayWorkers.map((worker, index) => [
                        worker,
                        mintAmount,
                    ]),
                    signerList: companyAccounts,
                },
                {
                    name: "burnTokens",
                    func: thanksPay.populateTransaction.burnTokens,
                    paramsList: throwAwayWorkers.map((worker, index) => [
                        burnAmount,
                        throwAwayCompanies[index],
                    ]),
                    signerList: workerAccounts,
                },
                {
                    name: "settlePartnerDebt",
                    func: thanksPay.populateTransaction.settlePartnerDebt,
                    paramsList: throwAwayCompanies.map((company, index) => [
                        company
                    ]),
                    signerList: Array(numWorkers).fill(ownerAccount),
                },
            ];
            gasCosts.push({
                "size": i
            });

            // Execute batches
            for (const batch of batches) {
                try {
                    let gasUsed: any = 0;
                    const response = await createAndExecuteBatch(thanksPay, batcher, owner, batch.func, batch.paramsList, batch.signerList);
                    gasUsed = response.gasUsed;
                    gasCosts[gasCosts.length - 1][batch.name] = gasUsed / i;
                    const gasCost = gasUsed / i;
                    console.log(`Gas used for batch execution of ${batch.name}:`, Math.round(gasCost));
                } catch (e) {
                    console.log(e);
                }
            }

            console.log("Finished processing batch of size " + i);

            var jsonPath = path.join(__dirname, './dataAccountable.json');

            fs.writeFile(jsonPath, JSON.stringify(gasCosts), function (err: any) {
                if (err) {
                    console.log(err);
                }
            });

        });
    })
});