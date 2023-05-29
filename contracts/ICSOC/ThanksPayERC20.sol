pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract ThanksPaySalaryToken is ERC20Burnable, Ownable {
    // Mapping to track partner companies
    mapping(address => bool) public partnerCompanies;
    
    // Mapping to track workers
    mapping(address => bool) public workers;

    // Mapping to track partner debt
    mapping(address => uint256) public partnerDebt;

    constructor() ERC20("ThanksPaySalaryToken", "TPS") {}

    modifier onlyPartnerCompany() {
        require(partnerCompanies[msg.sender], "Only partner company can call this function.");
        _;
    }

    modifier onlyWorker() {
        require(workers[msg.sender], "Only worker can call this function.");
        _;
    }

    function addPartnerCompany(address companyAddress) external onlyOwner {
        partnerCompanies[companyAddress] = true;
    }

    function removePartnerCompany(address companyAddress) external onlyOwner {
        partnerCompanies[companyAddress] = false;
    }

    function addWorker(address workerAddress) external onlyOwner {
        workers[workerAddress] = true;
    }

    function removeWorker(address workerAddress) external onlyOwner {
        workers[workerAddress] = false;
    }

    function mintTokens(address to, uint256 amount) external onlyPartnerCompany {
        _mint(to, amount);
    }

    function burnTokens(uint256 amount, address companyAddress) external onlyWorker {
        require(partnerCompanies[companyAddress], "Invalid partner company address.");

        _burn(msg.sender, amount);

        // Increase the partner company's debt
        partnerDebt[companyAddress] += amount;
    }

    function salaryDay(address[] calldata workerAddresses, uint256[] calldata salaryAmounts) external onlyPartnerCompany {
        require(workerAddresses.length == salaryAmounts.length, "Invalid input lengths.");

        for (uint256 i = 0; i < workerAddresses.length; i++) {
            require(workers[workerAddresses[i]], "Invalid worker address.");
            _mint(workerAddresses[i], salaryAmounts[i]);
        }
    }

    function settlePartnerDebt(address companyAddress) external onlyOwner {
        require(partnerCompanies[companyAddress], "Invalid partner company address.");

        partnerDebt[companyAddress] = 0;
    }
}