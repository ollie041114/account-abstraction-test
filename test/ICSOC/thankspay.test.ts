const { expect } = require("chai");


describe.only("ThanksPay", function () {
  let ThanksPay, thanksPay, creditPointsToken, owner, addr1, addr2, addr3, addr4, addr5, addrs;

  beforeEach(async function () {
    const CreditPointsToken = await ethers.getContractFactory("ERC20Mock");
    creditPointsToken = await CreditPointsToken.deploy(1000000000000);
    await creditPointsToken.deployed();

    ThanksPay = await ethers.getContractFactory("ThanksPay");
    thanksPay = await ThanksPay.deploy(creditPointsToken.address);
    await thanksPay.deployed();
    
    [owner, addr1, addr2, addr3, addr4, addr5, ...addrs] = await ethers.getSigners();
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
    console.log(workerAddresses);
    let tx5 = await thanksPay.connect(owner).salaryDay(workerAddresses);
    let cost5 = await calculateGasCost(tx5);
    finalCost = finalCost.add(cost5);

    console.log("Final gas cost:", finalCost);

    // Check final balances and ensure the scenario is executed as expected
//     for (let i = 0; i < workerMonthlySalaries.length; i++) {
//       let worker = await thanksPay.workers(addrs[i].address);
//       expect(worker.withdrawableBalance).to.equal(worker.monthlySalary);
//     }

//     let companyA = await thanksPay.companies(addr1.address);
//     expect(companyA.chargeableBalance.add(finalCost)).to.be.closeTo(ethers.utils.parseEther("84.25"), 10000);
  });
});