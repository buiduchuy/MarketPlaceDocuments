const hre = require("hardhat");

async function main() {
  // 1. Deploy StudyToken
  const Token = await hre.ethers.getContractFactory("StudyToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("Token deployed to:", tokenAddress);

  // 2. Deploy ICO (phải truyền địa chỉ Token vào constructor)
  const ICO = await hre.ethers.getContractFactory("ICO");
  const ico = await ICO.deploy(tokenAddress);
  await ico.waitForDeployment();
  const icoAddress = await ico.getAddress();
  console.log("ICO deployed to:", icoAddress);

  // 3. Deploy Marketplace
  const Market = await hre.ethers.getContractFactory("DocumentMarketplace");
  const market = await Market.deploy(tokenAddress);
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log("Marketplace deployed to:", marketAddress);

  // 4. CHUYỂN TOKEN CHO ICO (Bước quan trọng nhất)
  // Trong script của bạn cũ bị lỗi dòng: await studyToken.transfer(...) do sai tên biến
  console.log("Sending tokens to ICO...");
  const transferTx = await token.transfer(icoAddress, hre.ethers.parseEther("500000"));
  await transferTx.wait();
  
  console.log("Setup complete! ICO now has 500,000 STUDY tokens.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});