// Helper functions

async function getSigners(owner, amount) {
    const signers = [];
    for (let i = 0; i < amount; i++) {
        let wallet = ethers.Wallet.createRandom();
        wallet = wallet.connect(ethers.provider);
        await owner.sendTransaction({to: wallet.address, value: ethers.utils.parseEther('1')});
        signers.push(wallet);
    }
    return signers;
}

async function deployContract(contractName, ...args) {
    const ContractFactory = await ethers.getContractFactory(contractName);
    const contract = await ContractFactory.deploy(...args);
    await contract.deployed();
    return contract;
}

async function runBatchTests(functionsToTest, batcherContract, testContract, signers) {
    // Set up arrays for each function's parameter sets and signers.
    const functionData = functionsToTest.map((fn) => {
        return {
            name: fn.name,
            paramsList: fn.getParamsList(signers),
            signerList: fn.getSignerList(signers)
        };
    })

    // Execute the batches and return the gas costs.
    const gasCosts = [];
    for (const f of functionData) {
        const callResult = await createAndExecuteBatch(batcherContract, testContract, signers[0], f.paramsList, f.func, f.signerList);
        gasCosts.push({name: f.name, gasUsed: callResult.gasUsed / callResult.paramsList.length});
    }
    return gasCosts;
}

async function createAndExecuteBatch(batcher, contract, owner, paramsList, func, signerList) {
    // ... same code as in the original function ...
}

function saveGasCostsToFile(gasCosts, filename) {
    fs.writeFile(filename, JSON.stringify(gasCosts), function (err) {
        if (err) {
            console.log(err);
        }
    });
}

// Test suite
describe("Test Suite", function () {
    it("Custom Test", async function () {
        // Deploy and prepare contracts and signers
        const signers = await getSigners(await ethers.getSigner(), 100);
        const batcherContract = await deployContract("Batcher");
        const testContract = await deployContract("ThanksPay");

        // Define functions to test and their parameters and signers
        const contractFunctionsToTest = [
            {
                name: "enrollPartnerCompany",
                func: testContract.populateTransaction.enrollPartnerCompany,
                getParamsList: (signers) => {
                    return signers.slice(1, 11).map((account) => [
                        account.address,
                        30,
                        ethers.utils.parseEther("100"),
                    ]);
                },
                getSignerList: (signers) => {
                    return Array(10).fill(signers[0]);
                }
            },
            // ... more functions to test ...
        ];

        // Run the test
        const gasCosts = await runBatchTests(contractFunctionsToTest, batcherContract, testContract, signers);

        // Save the gas costs to a file
        saveGasCostsToFile(gasCosts, "gasCosts.json");
    });
});