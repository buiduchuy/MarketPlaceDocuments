import { ethers } from "ethers";

export const connectWallet = async () => {
  if (!window.ethereum) {
    alert("Hãy cài đặt MetaMask!");
    return null;
  }

  try {
    // 1. Yêu cầu kết nối tài khoản
    await window.ethereum.request({ method: "eth_requestAccounts" });

    // 2. Kiểm tra Chain ID ngay lập tức từ window.ethereum (Hex)
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    
    // Nếu không phải 31337 (0x7a69), yêu cầu MetaMask chuyển mạng
    if (currentChainId !== "0x7a69") {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7a69' }], // 31337 dưới dạng Hex
        });
      } catch (switchError) {
        // Nếu mạng chưa được add vào MetaMask, bạn có thể thêm logic addNetwork ở đây
        alert("Vui lòng chuyển sang mạng Hardhat Local trên MetaMask!");
        return null;
      }
    }

    // 3. Khởi tạo provider với phiên làm việc mới nhất
    const provider = new ethers.BrowserProvider(window.ethereum, "any"); 
    const signer = await provider.getSigner();
    
    return signer;
  } catch (error) {
    console.error("Lỗi kết nối ví:", error);
    return null;
  }
};