const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();


const n = 2;


describe("ThanksPaySalaryToken", function () {
    let ThanksPaySalaryToken, tpst, owner, addr1, addr2, addr3;

    beforeEach(async function () {
        const deployedContractAddress = process.env.DEPLOYED_CONTRACT_ADDRESS;

        if (!deployedContractAddress || deployedContractAddress === "") {
            throw new Error("DEPLOYED_CONTRACT_ADDRESS is not set in .env file");
        }

        ThanksPaySalaryToken = await ethers.getContractFactory("ThanksPaySalaryToken");
        tpst = await ThanksPaySalaryToken.attach(deployedContractAddress);

        [owner, addr1, addr2, addr3] = await ethers.getSigners();
    });


    async function measureLatency(func, ...args) {
        const startTime = Date.now();
        const result = await func(...args);
        const receipt = await result.wait();
        console.log(receipt.gasUsed.toString());
        const endTime = Date.now();
        const latency = endTime - startTime;

        return { result, latency };
    }
    async function saveLatencyData(testName, data) {
        const filePath = path.join(__dirname, "latency-data", "latency-data.json");
        let latencyData = {};

        // Check if the file exists, and if it does, load and parse the file content
        try {
            const existingFileContent = fs.readFileSync(filePath, { encoding: "utf-8" });
            latencyData = JSON.parse(existingFileContent);
        } catch (error) {
            // If the file does not exist, or there was an error loading data, just start with an empty object
        }

        // Append the new latency data to the existing data
        if (!latencyData[testName]) {
            latencyData[testName] = [];
        }

        latencyData[testName].push(data);

        // Save the updated data to the file
        const jsonData = JSON.stringify(latencyData);
        fs.writeFileSync(filePath, jsonData);
    }

    async function performRepeatedTransactions(testName, n, func, ...args) {

        const latencies = [];

        for (let i = 0; i < n; i++) {
            const { result, latency } = await measureLatency(func.bind(null, ...args));
            latencies.push(latency);
        }

        // Compute the average latency
        const avgLatency = latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length;
        console.log(`Average ${testName} latency:`, avgLatency, 'ms');

        // Save latency data to JSON file
        saveLatencyData(testName, { latencies, average_latency: avgLatency });

        return avgLatency;
    }

    it("Should add, remove partner company, and worker correctly, and measure latency", async function () {
        this.timeout(0);
        // Set the number of repetitions to 5

        // Perform repeated 'addPartnerCompany' transactions
        await performRepeatedTransactions("addPartnerCompany", n, tpst.addPartnerCompany, addr1.address);
        // Perform repeated 'removePartnerCompany' transactions
        // await performRepeatedTransactions("removePartnerCompany", n, tpst.removePartnerCompany, addr1.address);
        // Perform repeated 'addWorker' transactions
        await performRepeatedTransactions("addWorker", n, tpst.addWorker, addr2.address);
        // Perform repeated 'removeWorker' transactions
        // await performRepeatedTransactions("removeWorker", n, tpst.removeWorker, addr2.address);
    });

    it("Should mint tokens correctly and measure latency", async function () {
        this.timeout(0);
        await tpst.addPartnerCompany(addr1.address);

        await performRepeatedTransactions("mintTokens", n, tpst.mintTokens, addr1.address, 1000);

        // expect(await tpst.balanceOf(addr1.address)).to.equal(1000 * n);
    });

    it("Should execute salaryDay function correctly and measure latency", async function () {
        this.timeout(0);
        await tpst.addPartnerCompany(owner.address);
        await tpst.addWorker(addr1.address);
        await tpst.addWorker(addr2.address);

        const workerAddresses = [addr1.address, addr2.address];
        const salaryAmounts = [1000, 2000];

        await performRepeatedTransactions("salaryDay", n, tpst.salaryDay, workerAddresses, salaryAmounts);

        // expect(await tpst.balanceOf(addr1.address)).to.equal(1000 * n);
        // expect(await tpst.balanceOf(addr2.address)).to.equal(2000 * n);
    });

    it("Should burn tokens and settle partner debt correctly, and measure latency", async function () {
        this.timeout(0);
        await tpst.addPartnerCompany(owner.address);
        await tpst.addWorker(addr1.address);
        await tpst.mintTokens(addr1.address, 1000);

        await performRepeatedTransactions("burnTokens", n, tpst.connect(addr1).burnTokens, 100, owner.address);

        // expect(await tpst.balanceOf(addr1.address)).to.equal(1000 - 100 * n);
        // expect(await tpst.partnerDebt(owner.address)).to.equal(100 * n);

        await performRepeatedTransactions("settlePartnerDebt", n, tpst.settlePartnerDebt, owner.address);

        // expect(await tpst.partnerDebt(owner.address)).to.equal(0);
    });
});