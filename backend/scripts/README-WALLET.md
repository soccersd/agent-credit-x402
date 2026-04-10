# วิธีสร้าง Agentic Wallet สำหรับ AgentCredit

## Option 1: ใช้โค้ดสร้าง (แนะนำ)

```bash
cd backend
npm install ethers
node scripts/generate-wallet.js
```

จะได้ผลลัพธ์เช่น:
```
==========================================
  AGENT WALLET GENERATED
==========================================

Address: 0x1234abcd5678efgh9012ijkl3456mnop7890qrst
Private Key: 0xabc123...
Mnemonic: word1 word2 word3 ...

NEXT STEPS
1. Copy the Address above
2. Open backend/.env
3. Replace AGENT_WALLET with your new address
4. Fund the wallet with OKB/USDC on X Layer
```

**จากนั้น:**
1. Copy `Address` ที่ได้
2. เปิด `backend/.env`
3. แก้ `AGENT_WALLET=0x0000...` เป็น address จริง
4. เติม OKB/USDC เข้า wallet นี้ผ่าน X Layer

---

## Option 2: สร้างผ่าน MetaMask

1. ติดตั้ง [MetaMask](https://metamask.io/)
2. เพิ่ม X Layer Network:
   - Network Name: `X Layer`
   - RPC URL: `https://rpc.xlayer.tech`
   - Chain ID: `196`
   - Symbol: `OKB`
   - Explorer: `https://www.oklink.com/xlayer`
3. Create Account ใหม่ใน MetaMask
4. Copy address แล้วใส่ใน `backend/.env`:
   ```bash
   AGENT_WALLET=<your-address>
   ```

---

## Option 3: สร้างผ่าน OKX Wallet

1. เปิด OKX Wallet
2. สร้าง wallet ใหม่หรือใช้ wallet ที่มี
3. Switch network เป็น X Layer (Chain ID: 196)
4. Copy address แล้วใส่ใน `backend/.env`

---

## เติมเงินเข้า Wallet

หลังสร้าง wallet แล้ว ต้องเติม OKB/USDC เพื่อให้ agent ทำงานได้:

1. **ซื้อ OKB/USDC** บน OKX Exchange
2. **Withdraw ไป X Layer**:
   - เลือก Network: `X Layer`
   - ใส่ Address ของ agent wallet
3. **หรือใช้ Bridge**: โอนจาก Ethereum/Base มา X Layer ผ่าน bridge

---

## ตรวจสอบ Wallet Balance

```bash
# ใช้ curl ตรวจสอบ balance
curl -X POST https://rpc.xlayer.tech \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["<YOUR_ADDRESS>","latest"],"id":1}'
```

หรือใช้ [OKLink X Layer Explorer](https://www.oklink.com/xlayer) แล้ว search address
