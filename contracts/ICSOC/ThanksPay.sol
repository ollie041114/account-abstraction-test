pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";


contract ThanksPay {
    address public owner;
    IERC20 public creditPointsToken;

    struct Company {
        uint256 chargeableBalance;
        uint256 serviceFeePoints;
        uint8 salaryDay;
        bool approval;
    }

    struct Worker {
        uint256 withdrawableBalance;
        uint256 monthlySalary;
        address companyAddress;
        bool approval;
    }

    mapping(address => Company) public companies;
    mapping(address => Worker) public workers;
    mapping(address => bool) public workerApproval;
    mapping(address => bool) public companyApproval;

    event RequestProcessed(
        address indexed workerAddress,
        address indexed companyAddress,
        uint256 amount
    );
    event ChargeableBalanceIncreased(
        address indexed companyAddress,
        uint256 amount,
        uint256 serviceFeePayment
    );

    constructor(address _creditPointsToken) {
        owner = msg.sender;
        creditPointsToken = IERC20(_creditPointsToken);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function.");
        _;
    }

    modifier onlyEnrolled() {
        require(
            workers[msg.sender].approval || companies[msg.sender].approval,
            "Not enrolled."
        );
        _;
    }

    function enrollWorker(
        address workerAddress,
        address companyAddress,
        uint256 monthlySalary
    ) external {
        // require(!workerApproval[workerAddress], "Worker already enrolled.");
        // require(companyApproval[companyAddress], "Company not enrolled.");

        workers[workerAddress].approval = true;
        workers[workerAddress].withdrawableBalance = monthlySalary;
        workers[workerAddress].monthlySalary = monthlySalary;
        workers[workerAddress].companyAddress = companyAddress;
    }

    function serviceFeePoints(
        address companyAddress
    ) public view returns (uint256){
        Company storage company = companies[companyAddress];
        return company.serviceFeePoints;
    }

    function enrollPartnerCompany(
        address companyAddress,
        uint8 _salaryDay,
        uint256 initialChargeableBalance
    ) external {
        // require(
        //     !companies[companyAddress].approval,
        //     "Company already enrolled."
        // );
        // require(_salaryDay > 0 && _salaryDay <= 31, "Invalid salary day.");

        companyApproval[companyAddress] = true;
        companies[companyAddress].approval = true;
        companies[companyAddress].chargeableBalance = initialChargeableBalance;
        companies[companyAddress].salaryDay = _salaryDay;
    }

    function requestSalaryAdvance(uint256 amount) external onlyEnrolled {
        // require(workers[msg.sender].approval, "Worker not registered.");
        Worker storage worker = workers[msg.sender];
        Company storage company = companies[worker.companyAddress];

        uint256 bonusFee = (amount * 5) / 100;
        
        require(
            company.chargeableBalance >= amount + bonusFee,
            "Company chargeable balance isn't enough to cover bonus fee."
        );

        worker.withdrawableBalance -= amount;
        company.chargeableBalance -= amount + bonusFee;
        company.serviceFeePoints += bonusFee;

        emit RequestProcessed(msg.sender, worker.companyAddress, amount);
    }

    function increaseChargeableBalance(
        address companyAddress,
        uint256 amount
    ) external {
        // require(companies[companyAddress].approval, "Company not registered.");

        uint256 totalAmount = amount + companies[companyAddress].serviceFeePoints;

        companies[companyAddress].chargeableBalance += amount;
        companies[companyAddress].serviceFeePoints = 0;

        emit ChargeableBalanceIncreased(
            companyAddress,
            amount,
            totalAmount - amount
        );
    }

    function updateWithdrawableBalance() external onlyEnrolled {
        // require(workerApproval[msg.sender], "Worker not registered.");
        Worker storage worker = workers[msg.sender];
        Company storage company = companies[worker.companyAddress];

        if ((block.timestamp % 30) + 1 == company.salaryDay) {
            worker.withdrawableBalance = worker.monthlySalary;
        }
    }

    function salaryDay(address[] calldata workerAddresses) external {
        for (uint256 i = 0; i < workerAddresses.length; i++) {
            address workerAddress = workerAddresses[i];
            require(workers[workerAddress].approval, "Worker not registered.");

            Worker storage worker = workers[workerAddress];
            worker.withdrawableBalance = worker.monthlySalary;
        }
    }
}
