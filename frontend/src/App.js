import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { connectWallet } from "./wallet";
import {
  TOKEN_ADDRESS, TOKEN_ABI,
  MARKET_ADDRESS, MARKET_ABI,
  ICO_ADDRESS, ICO_ABI
} from "./contracts";

function App() {
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("0");
  const [docs, setDocs] = useState([]);
  const [ownedIds, setOwnedIds] = useState([]);
  const [ethAmount, setEthAmount] = useState("");
  const [newDoc, setNewDoc] = useState({ title: "", desc: "", price: "", hash: "" });
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Tự động tải dữ liệu khi ví được kết nối
  useEffect(() => {
    if (signer && address) loadData();
  }, [signer, address]);

  async function loadData() {
    await getBalance();
    await loadMarketplace();
  }

  async function connect() {
    const s = await connectWallet();
    if (s) {
      const addr = await s.getAddress();
      setSigner(s);
      setAddress(addr);
    }
  }

  async function getBalance() {
    try {
      const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
      const bal = await token.balanceOf(address);
      setBalance(ethers.formatUnits(bal, 18));
    } catch (e) { console.error("Lỗi lấy số dư:", e); }
  }

  async function loadMarketplace() {
    try {
      const market = new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, signer);
      const allDocs = await market.getAllDocuments();
      
      // Lọc tài liệu hợp lệ (ID > 0)
      const validDocs = allDocs.filter(d => d.id > 0n);
      setDocs(validDocs);

      // LOGIC QUAN TRỌNG: Kiểm tra quyền sở hữu song song để đồng bộ UI
      const accessStatuses = await Promise.all(
        validDocs.map(async (d) => {
          const hasAccess = await market.hasAccess(d.id, address);
          const isAuthor = d.author.toLowerCase() === address.toLowerCase();
          
          // Trả về ID dưới dạng string nếu đã mua hoặc là tác giả
          return (hasAccess || isAuthor) ? d.id.toString() : null;
        })
      );

      const owned = accessStatuses.filter(id => id !== null);
      console.log("Dữ liệu sở hữu thực tế từ Blockchain:", owned);
      setOwnedIds(owned);

    } catch (e) { 
      console.error("Lỗi đồng bộ Marketplace:", e); 
    }
  }

  async function purchaseDoc(id, price) {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
      const market = new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, signer);

      // Bước 1: Kiểm tra và Approve STUDY token nếu cần
      const allowance = await token.allowance(address, MARKET_ADDRESS);
      if (allowance < price) {
        console.log("Đang yêu cầu Approve...");
        const appTx = await token.approve(MARKET_ADDRESS, price);
        await appTx.wait();
      }

      // Bước 2: Thực hiện mua tài liệu
      console.log("Đang thực hiện thanh toán...");
      const buyTx = await market.buyDocument(id, { gasLimit: 300000 });
      const receipt = await buyTx.wait();

      if (receipt.status === 1) {
        // Cập nhật State ảo ngay lập tức để ẩn nút Mua trước khi loadData xong
        setOwnedIds(prev => [...prev, id.toString()]);
        await loadData();
        alert("Thanh toán thành công! Tài liệu đã được mở khóa.");
      }
    } catch (err) {
      console.error("Giao dịch lỗi:", err);
      if (err.message.includes("Already owned")) {
        alert("Blockchain báo: Bạn đã sở hữu tài liệu này rồi!");
        loadMarketplace(); // Ép cập nhật lại UI
      } else {
        alert("Giao dịch thất bại. Vui lòng kiểm tra số dư hoặc kết nối mạng.");
      }
    } finally {
      setIsProcessing(false);
    }
  }

  async function buyToken() {
    try {
      const ico = new ethers.Contract(ICO_ADDRESS, ICO_ABI, signer);
      const tx = await ico.buyTokens({ value: ethers.parseEther(ethAmount) });
      await tx.wait();
      alert("Nạp STUDY thành công!");
      loadData();
    } catch (e) { alert("Lỗi nạp STUDY"); }
  }

  async function uploadDoc() {
    if (!newDoc.title || !newDoc.price || !newDoc.hash) return alert("Vui lòng nhập đủ thông tin");
    try {
      const market = new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, signer);
      const priceWei = ethers.parseUnits(newDoc.price, 18);
      const tx = await market.uploadDocument(newDoc.title, newDoc.desc || "", priceWei, newDoc.hash);
      await tx.wait();
      alert("Đăng tài liệu thành công!");
      loadData();
    } catch (e) { console.error(e); }
  }

  return (
    <div style={styles.body}>
      {/* Thanh điều hướng */}
      <div style={styles.navbar}>
        <h2 style={styles.logo}>STUDY MARKET</h2>
        {address ? (
          <div style={styles.walletGroup}>
            <div style={styles.addressPill}>{address.substring(0, 6)}...{address.slice(-4)}</div>
            <div style={styles.balancePill}>{balance} STUDY</div>
          </div>
        ) : (
          <button onClick={connect} style={styles.btnConnect}>KẾT NỐI VÍ</button>
        )}
      </div>

      <div style={styles.container}>
        {!address ? (
          <div style={styles.welcomeBox}>
            <h1 style={{fontSize: "42px", color: "#2d3436", marginBottom: "15px"}}>Thị trường Tài liệu Web3</h1>
            <p style={{color: "#636e72", fontSize: "18px"}}>Mua bán kiến thức an toàn và phi tập trung.</p>
            <button onClick={connect} style={{...styles.btnConnect, marginTop: "20px", padding: "15px 40px"}}>BẮT ĐẦU NGAY</button>
          </div>
        ) : (
          <>
            <div style={styles.actionGrid}>
              {/* Nạp tiền */}
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>NẠP STUDY TOKEN</h3>
                <input 
                  type="number" 
                  placeholder="Nhập số lượng ETH" 
                  onChange={e => setEthAmount(e.target.value)} 
                  style={styles.input} 
                />
                <button onClick={buyToken} style={styles.btnGreen}>ĐỔI ETH LẤY TOKEN</button>
              </div>

              {/* Đăng bài */}
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>ĐĂNG TÀI LIỆU MỚI</h3>
                <input placeholder="Tiêu đề" onChange={e => setNewDoc({...newDoc, title: e.target.value})} style={styles.input} />
                <div style={{display: "flex", gap: "10px"}}>
                  <input placeholder="Giá (STUDY)" onChange={e => setNewDoc({...newDoc, price: e.target.value})} style={styles.input} />
                  <input placeholder="Hash/Link IPFS" onChange={e => setNewDoc({...newDoc, hash: e.target.value})} style={styles.input} />
                </div>
                <button onClick={uploadDoc} style={styles.btnDark}>NIÊM YẾT LÊN CHỢ</button>
              </div>
            </div>

            <h2 style={styles.sectionHeader}>TÀI LIỆU HIỆN CÓ</h2>
            <div style={styles.marketGrid}>
              {docs.map(doc => {
                const docId = doc.id.toString();
                const isOwned = ownedIds.includes(docId);
                return (
                  <div key={docId} style={styles.docCard}>
                    <div style={styles.docBadge}>Tài liệu # {docId}</div>
                    <h4 style={styles.docTitle}>{doc.title}</h4>
                    <p style={styles.docDesc}>{doc.description || "Không có mô tả chi tiết cho tài liệu này."}</p>
                    
                    <div style={styles.docFooter}>
                      <div style={styles.priceTag}>{ethers.formatUnits(doc.price, 18)} <span style={{fontSize: "12px"}}>STUDY</span></div>
                      {isOwned ? (
                        <div style={styles.ownedBox}>
                          <span style={{fontSize: "11px", color: "#27ae60", fontWeight: "bold"}}>ĐÃ MỞ KHÓA</span>
                          <code style={styles.hashCode}>{doc.ipfsHash}</code>
                        </div>
                      ) : (
                        <button 
                          onClick={() => purchaseDoc(doc.id, doc.price)} 
                          disabled={isProcessing}
                          style={isProcessing ? styles.btnDisabled : styles.btnBuy}
                        >
                          {isProcessing ? "ĐANG XỬ LÝ..." : "MUA NGAY"}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  body: { backgroundColor: "#f9fafb", minHeight: "100vh", fontFamily: "'Inter', sans-serif" },
  navbar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 5%", backgroundColor: "#fff", borderBottom: "1px solid #eee", sticky: "top" },
  logo: { color: "#1a73e8", fontWeight: "900", margin: 0, letterSpacing: "1px" },
  walletGroup: { display: "flex", gap: "10px" },
  addressPill: { backgroundColor: "#f1f3f4", padding: "8px 15px", borderRadius: "20px", fontSize: "14px", fontWeight: "600" },
  balancePill: { backgroundColor: "#e6f4ea", color: "#1e8e3e", padding: "8px 15px", borderRadius: "20px", fontSize: "14px", fontWeight: "700" },
  btnConnect: { backgroundColor: "#1a73e8", color: "white", border: "none", padding: "10px 25px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" },
  
  container: { maxWidth: "1100px", margin: "40px auto", padding: "0 20px" },
  welcomeBox: { textAlign: "center", padding: "80px 0" },
  actionGrid: { display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "30px", marginBottom: "50px" },
  card: { backgroundColor: "#fff", padding: "25px", borderRadius: "15px", border: "1px solid #eee", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" },
  cardTitle: { fontSize: "14px", fontWeight: "800", color: "#5f6368", marginBottom: "15px", textTransform: "uppercase" },
  
  input: { width: "100%", padding: "12px", marginBottom: "12px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box", fontSize: "14px" },
  btnGreen: { width: "100%", padding: "12px", backgroundColor: "#34a853", color: "white", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" },
  btnDark: { width: "100%", padding: "12px", backgroundColor: "#202124", color: "white", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" },

  sectionHeader: { fontSize: "20px", fontWeight: "900", color: "#202124", marginBottom: "25px", borderLeft: "4px solid #1a73e8", paddingLeft: "15px" },
  marketGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "25px" },
  docCard: { backgroundColor: "#fff", padding: "25px", borderRadius: "20px", border: "1px solid #eee", transition: "0.2s" },
  docBadge: { fontSize: "10px", color: "#1a73e8", fontWeight: "800", marginBottom: "10px" },
  docTitle: { margin: "0 0 10px 0", fontSize: "18px", color: "#202124" },
  docDesc: { color: "#5f6368", fontSize: "14px", lineHeight: "1.5", height: "42px", overflow: "hidden" },
  
  docFooter: { marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #f8f9fa" },
  priceTag: { fontSize: "22px", fontWeight: "900", color: "#202124", marginBottom: "15px" },
  btnBuy: { width: "100%", padding: "12px", backgroundColor: "#fbbc04", color: "#000", border: "none", borderRadius: "10px", fontWeight: "800", cursor: "pointer" },
  btnDisabled: { width: "100%", padding: "12px", backgroundColor: "#f1f3f4", color: "#9aa0a6", border: "none", borderRadius: "10px", cursor: "not-allowed" },
  
  ownedBox: { backgroundColor: "#e6f4ea", padding: "15px", borderRadius: "12px", border: "1px solid #ceead6" },
  hashCode: { display: "block", marginTop: "5px", color: "#0d652d", wordBreak: "break-all", fontSize: "12px", fontFamily: "monospace" }
};

export default App;