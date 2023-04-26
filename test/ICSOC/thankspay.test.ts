import { Signer } from "ethers";

const { expect } = require("chai");


describe.only("ThanksPay", function () {
    let Batcher, batcher: any, ThanksPay, thanksPay: any, creditPointsToken, owner: Signer, addr1: Signer, addr2: Signer, addr3: Signer, addr4: Signer, addr5: Signer, addrsRand: Signer, addrs: Signer;

    let gas1, gas2;
    beforeEach(async function () {
        const CreditPointsToken = await ethers.getContractFactory("ERC20Mock");
        creditPointsToken = await CreditPointsToken.deploy(1000000000000);
        await creditPointsToken.deployed();

        ThanksPay = await ethers.getContractFactory("ThanksPay");
        thanksPay = await ThanksPay.deploy(creditPointsToken.address);
        await thanksPay.deployed();

        Batcher = await ethers.getContractFactory("Batcher");
        batcher = await Batcher.deploy();
        await batcher.deployed();
        [owner, addr1, addr2, addr3, addr4, addr5, ...addrsRand] = await ethers.getSigners();

        const randomSigners = async (amount: number): Promise<Signer[]> => {
            const signers: Signer[] = []
            for (let i = 0; i < amount; i++) {
              let wallet = ethers.Wallet.createRandom();
              wallet =  wallet.connect(ethers.provider);
              await owner.sendTransaction({ to: wallet.address, value: ethers.utils.parseEther('2') })
              signers.push(wallet);
            }
            return signers
          }
        [...addrs] = await randomSigners(40);
        console.log("The amount of free addresses: ", addrs.length);
    });

    async function calculateGasCost(tx) {
        const receipt = await tx.wait();
        const gasUsed = receipt.gasUsed;
        //const gasPrice = (await tx.getTransaction()).gasPrice;
        return gasUsed;
    }

    it("enrolls a company, workers, processes salary advances, increases chargeable balance, and resets withdrawable balance", async function () {
        let finalCost = ethers.BigNumber.from(0);

        // Enroll Company A
        let companyAInitialChargeableBalance = ethers.utils.parseEther("100");
        let tx1 = await thanksPay.connect(owner).enrollPartnerCompany(addr1.address, 30, companyAInitialChargeableBalance);
        let cost1 = await calculateGasCost(tx1);
        finalCost = finalCost.add(cost1);

        // Enroll workers and assign them to Company A
        const workerMonthlySalaries = [
            ethers.utils.parseEther("5"),
            ethers.utils.parseEther("10"),
            ethers.utils.parseEther("7"),
            ethers.utils.parseEther("15"),
            ethers.utils.parseEther("13"),
        ];

        for (let i = 0; i < workerMonthlySalaries.length; i++) {
            let tx2 = await thanksPay.connect(owner).enrollWorker(addrs[i].address, addr1.address, workerMonthlySalaries[i]);
            let cost2 = await calculateGasCost(tx2);
            finalCost = finalCost.add(cost2);
        }

        // Request Salary Advances: Worker1 (2 ETH), Worker3 (3 ETH), Worker5 (10 ETH)
        const advanceRequested = [
            { worker: addrs[0], amount: ethers.utils.parseEther("2") },
            { worker: addrs[2], amount: ethers.utils.parseEther("3") },
            { worker: addrs[4], amount: ethers.utils.parseEther("10") },
        ];

        for (let i = 0; i < advanceRequested.length; i++) {
            let tx3 = await thanksPay.connect(advanceRequested[i].worker).requestSalaryAdvance(advanceRequested[i].amount);
            let cost3 = await calculateGasCost(tx3);
            finalCost = finalCost.add(cost3);
        }

        // Increase Chargeable Balance (Company A): 50 ETH
        let topUpAmount = ethers.utils.parseEther("50");
        let owedServiceFees = await thanksPay.serviceFeePoints(addr1.address);
        let totalAmount = topUpAmount.add(owedServiceFees);

        let tx4 = await thanksPay.connect(addr1).increaseChargeableBalance(addr1.address, totalAmount);
        let cost4 = await calculateGasCost(tx4);
        finalCost = finalCost.add(cost4);

        // Reset withdrawable balance for all workers on the salary day
        let workerAddresses = addrs.slice(0, workerMonthlySalaries.length);
        workerAddresses = workerAddresses.map((e) => e.address);
        let tx5 = await thanksPay.connect(owner).salaryDay(workerAddresses);
        let cost5 = await calculateGasCost(tx5);
        finalCost = finalCost.add(cost5);

        gas1 = finalCost * 5

        console.log("Final gas 1 cost:", gas1);

        // Check final balances and ensure the scenario is executed as expected
        //     for (let i = 0; i < workerMonthlySalaries.length; i++) {
        //       let worker = await thanksPay.workers(addrs[i].address);
        //       expect(worker.withdrawableBalance).to.equal(worker.monthlySalary);
        //     }

        //     let companyA = await thanksPay.companies(addr1.address);
        //     expect(companyA.chargeableBalance.add(finalCost)).to.be.closeTo(ethers.utils.parseEther("84.25"), 10000);
    });


    it("enrolls accounts, signs actions, and sends them to the Batcher contract", async function () {
        const publicKeyAccounts = [owner, addr1, addr2, addr3, addr4, addr5, addrs[0]];

        // Enroll the public key accounts in the Batcher contract and assign them ThrowawayAccounts
        const enrollInBatcherPromises = publicKeyAccounts.map((account) => {
            return batcher.connect(account).enroll(account.address);
        });
        await Promise.all(enrollInBatcherPromises);

        const throwAwayAccountAddresses = await Promise.all(
            publicKeyAccounts.map((account) => batcher.throwawayAccounts(account.address))
        );

        const signersForTx = [
            owner,
            owner,
            owner,
            owner,
            owner,
            owner,
            publicKeyAccounts[2],
            publicKeyAccounts[4],
            publicKeyAccounts[6],
            publicKeyAccounts[1],
            owner
        ];

        // Get txData
        const txDataPromises = [
            thanksPay.populateTransaction.enrollPartnerCompany(throwAwayAccountAddresses[1], 30, ethers.utils.parseEther("100")),
            thanksPay.populateTransaction.enrollWorker(throwAwayAccountAddresses[2], throwAwayAccountAddresses[1], ethers.utils.parseEther("5")),
            thanksPay.populateTransaction.enrollWorker(throwAwayAccountAddresses[3], throwAwayAccountAddresses[1], ethers.utils.parseEther("10")),
            thanksPay.populateTransaction.enrollWorker(throwAwayAccountAddresses[4], throwAwayAccountAddresses[1], ethers.utils.parseEther("7")),
            thanksPay.populateTransaction.enrollWorker(throwAwayAccountAddresses[5], throwAwayAccountAddresses[1], ethers.utils.parseEther("15")),
            thanksPay.populateTransaction.enrollWorker(throwAwayAccountAddresses[6], throwAwayAccountAddresses[1], ethers.utils.parseEther("13")),
            thanksPay.populateTransaction.requestSalaryAdvance(ethers.utils.parseEther("2")),
            thanksPay.populateTransaction.requestSalaryAdvance(ethers.utils.parseEther("3")),
            thanksPay.populateTransaction.requestSalaryAdvance(ethers.utils.parseEther("10")),
            thanksPay.populateTransaction.increaseChargeableBalance(throwAwayAccountAddresses[1], ethers.utils.parseEther("50")),
            thanksPay.populateTransaction.salaryDay(throwAwayAccountAddresses.slice(2, throwAwayAccountAddresses.length)),
        ]


        const txDataArray = await Promise.all(txDataPromises);

        // Collect all signatures, txData and contractAddrs
        // const funcHashs = txDataArray.map((txData) => ethers.utils.arrayify(txData.data.slice(0, 10)));
        // const args = txDataArray.map((txData) => ethers.utils.defaultAbiCoder.decode(['uint256[]'], txData.data.slice(txData.data.indexOf('2'), txData.data.length)));
        const contractAddrs = txDataArray.map(() => thanksPay.address);

        // Send them to the Batcher contract
        // const encodedTransactions = await batcher.encodeTransactions(funcHashs, args);
        const encodedTransactions = (txDataArray as any).map((tx) => tx.data);
        const batchernonce = 1;

        // Sign txData with corresponding accounts
        const signedDataPromises = txDataArray.map(async (txData, index) => {
            const hash = ethers.utils.solidityKeccak256(['bytes', 'uint256'], [txData.data, batchernonce]);
            const signer = signersForTx[index];

            const signature = await signer.signMessage(ethers.utils.arrayify(hash));
            return signature;
        });

        const sigs = await Promise.all(signedDataPromises);

        // 35 transactions in total! 7*5
        const repeat = (arr: any[]) => [].concat(...Array(2).fill(arr));

        const tx = await batcher.connect(owner).executeTransactions(repeat(contractAddrs), repeat(encodedTransactions), batchernonce, repeat(sigs));
        const receipt = await tx.wait();

        gas2 = receipt.gasUsed * 1;

        console.log("Final gas 2 cost: ", gas2);
        console.log("Ratio: ", gas1 / gas2);
        // Verify the accounts are enrolled in the ThanksPay contract
        // const enrolled = await thanksPay.workers(addrs[0].address);
        // expect(enrolled.company).to.equal(addr1.address);
        // expect(enrolled.monthlySalary).to.equal(ethers.utils.parseEther("5"));
    });


    it("Enrolls different stuffs", async function () {
        const numIterations = 5;
        const accountsPerIteration = 7;
        let publicKeyAccounts: any = [];
        let throwAwayAccountAddresses: any = [];
        let txDataArray: any = [];
        let sigs: any = [];
        let batcherNonce = 1;

        for (let i = 0; i < numIterations; i++) {
            const offset = accountsPerIteration * i;
            const newPublicKeyAccounts = [
                owner,
                (addrs as any)[offset],
                (addrs as any)[offset + 1],
                (addrs as any)[offset + 2],
                (addrs as any)[offset + 3],
                (addrs as any)[offset + 4],
                (addrs as any)[offset + 5],
            ];

            publicKeyAccounts = publicKeyAccounts.concat(newPublicKeyAccounts);

            // Enroll the new public key accounts in the Batcher contract and assign them ThrowawayAccounts
            const enrollInBatcherPromises = newPublicKeyAccounts.map((account) => {
                return batcher.connect(account).enroll(account.address);
            });

            await Promise.all(enrollInBatcherPromises);

            const newThrowAwayAccountAddresses = await Promise.all(
                newPublicKeyAccounts.map((account) => batcher.throwawayAccounts(account.address))
            );

            throwAwayAccountAddresses = throwAwayAccountAddresses.concat(newThrowAwayAccountAddresses);

            // Get txData
            const txDataPromises = [
                thanksPay.populateTransaction.enrollPartnerCompany(throwAwayAccountAddresses[offset + 1], 30, ethers.utils.parseEther("100")),
                // Additional transactions with modified offsets
                thanksPay.populateTransaction.enrollWorker(throwAwayAccountAddresses[offset + 2], throwAwayAccountAddresses[offset + 1], ethers.utils.parseEther("5")),
                thanksPay.populateTransaction.enrollWorker(throwAwayAccountAddresses[offset + 3], throwAwayAccountAddresses[offset + 1], ethers.utils.parseEther("10")),
                thanksPay.populateTransaction.enrollWorker(throwAwayAccountAddresses[offset + 4], throwAwayAccountAddresses[offset + 1], ethers.utils.parseEther("7")),
                thanksPay.populateTransaction.enrollWorker(throwAwayAccountAddresses[offset + 5], throwAwayAccountAddresses[offset + 1], ethers.utils.parseEther("15")),
                thanksPay.populateTransaction.enrollWorker(throwAwayAccountAddresses[offset + 6], throwAwayAccountAddresses[offset + 1], ethers.utils.parseEther("13")),
                thanksPay.populateTransaction.requestSalaryAdvance(ethers.utils.parseEther("2")),
                thanksPay.populateTransaction.requestSalaryAdvance(ethers.utils.parseEther("3")),
                thanksPay.populateTransaction.requestSalaryAdvance(ethers.utils.parseEther("10")),
                thanksPay.populateTransaction.increaseChargeableBalance(throwAwayAccountAddresses[offset + 1], ethers.utils.parseEther("50")),
                thanksPay.populateTransaction.salaryDay(throwAwayAccountAddresses.slice(offset + 2, throwAwayAccountAddresses.length)),
            ];

            const newTxDataArray = await Promise.all(txDataPromises);

            txDataArray = txDataArray.concat(newTxDataArray);

            const signersForTx = [
                owner,
                owner,
                owner,
                owner,
                owner,
                owner,
                newPublicKeyAccounts[2],
                newPublicKeyAccounts[4],
                newPublicKeyAccounts[6],
                newPublicKeyAccounts[1],
                owner
            ];

            // Rest of the code for populating and signing transactions
            // ...

            // Sign txData with corresponding accounts
            const signedDataPromises = newTxDataArray.map(async (txData, index) => {
            const hash = ethers.utils.solidityKeccak256(['bytes', 'uint256'], [txData.data, batcherNonce]);
            const signer = signersForTx[index];

            const signature = await signer.signMessage(ethers.utils.arrayify(hash));
            return signature;
            });

            const newSigs = await Promise.all(signedDataPromises);

            sigs = sigs.concat(newSigs);
        }
        const contractAddrs = txDataArray.map(() => thanksPay.address);
        const encodedTransactions = (txDataArray as any).map((tx) => tx.data);

        const tx = await batcher.connect(owner).executeTransactions(contractAddrs, encodedTransactions, batcherNonce, sigs);
        const receipt = await tx.wait();

        gas2 = receipt.gasUsed * 1;

        console.log("Final gas 2 cost: ", gas2);
        console.log("Ratio: ", gas1 / gas2);
    })



});