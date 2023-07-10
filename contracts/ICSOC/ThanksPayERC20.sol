pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract ThanksPaySalaryToken is ERC20Burnable, ERC2771Context {
    // Mapping to track partner companies
    mapping(address => bool) public partnerCompanies;

    // Mapping to track workers
    mapping(address => bool) public workers;

    // Mapping to track partner debt
    mapping(address => uint256) public partnerDebt;

    address public owner;

    constructor(
        address relayer
    ) ERC20("ThanksPaySalaryToken", "TPS") ERC2771Context(relayer) {
        owner = msg.sender;
    }

    function _msgSender()
        internal
        view
        override(Context, ERC2771Context)
        returns (address sender)
    {
        sender = ERC2771Context._msgSender();
        return sender;
    }

    function _msgData()
        internal
        view
        override(Context, ERC2771Context)
        returns (bytes calldata)
    {
        return ERC2771Context._msgData();
    }

    modifier onlyOwner() {
        require(
            owner == _msgSender(),
            "Only called by owner"
        );
        _;
    }

    modifier onlyPartnerCompany() {
        require(
            partnerCompanies[_msgSender()],
            "Only partner company can call this function."
        );
        _;
    }

    modifier onlyWorker() {
        require(workers[_msgSender()], "Only worker can call this function.");
        _;
    }

    function addPartnerCompany(address companyAddress) external onlyOwner() {
        partnerCompanies[companyAddress] = true;
    }

    function removePartnerCompany(address companyAddress) external onlyOwner() {
        partnerCompanies[companyAddress] = false;
    }

    function addWorker(address workerAddress) external onlyOwner() {
        workers[workerAddress] = true;
    }

    function removeWorker(address workerAddress) external onlyOwner() {
        workers[workerAddress] = false;
    }

    function mintTokens(
        address to,
        uint256 amount
    ) external onlyPartnerCompany {
        _mint(to, amount);
    }

    function burnTokens(
        uint256 amount,
        address companyAddress
    ) external onlyWorker {
        require(
            partnerCompanies[companyAddress],
            "Invalid partner company address."
        );

        _burn(_msgSender(), amount);

        // Increase the partner company's debt
        partnerDebt[companyAddress] += amount;
    }

    function salaryDay(
        address[] calldata workerAddresses,
        uint256[] calldata salaryAmounts
    ) external onlyPartnerCompany {
        require(
            workerAddresses.length == salaryAmounts.length,
            "Invalid input lengths."
        );

        for (uint256 i = 0; i < workerAddresses.length; i++) {
            require(workers[workerAddresses[i]], "Invalid worker address.");
            _mint(workerAddresses[i], salaryAmounts[i]);
        }
    }

    function settlePartnerDebt(address companyAddress) external onlyOwner() {
        require(
            partnerCompanies[companyAddress],
            "Invalid partner company address."
        );

        partnerDebt[companyAddress] = 0;
    }
}
