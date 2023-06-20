const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { ethers } = require("hardhat");

async function main() {
  const ThanksPaySalaryToken = await ethers.getContractFactory("ThanksPaySalaryToken");
  const tpst = await ThanksPaySalaryToken.deploy();
  await tpst.deployed();

  console.log("ThanksPaySalaryToken deployed to:", tpst.address);

  // Load .env file
  const envPath = path.resolve(process.cwd(), ".env");
  const envVars = dotenv.parse(fs.readFileSync(envPath));

  // Update the DEPLOYED_CONTRACT_ADDRESS variable
  envVars["DEPLOYED_CONTRACT_ADDRESS"] = tpst.address;

  // Write the updated variables back to the .env file
  const updatedEnv = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  fs.writeFileSync(envPath, updatedEnv);

  console.log("Contract address saved to .env file");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });