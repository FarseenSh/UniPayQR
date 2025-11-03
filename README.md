# 🚀 UniPayQR

**Pay Indian Merchants with Bitcoin-Backed mUSD - Seamlessly**

[![Mezo Testnet](https://img.shields.io/badge/Mezo-Testnet-blue?style=for-the-badge)](https://explorer.mezo.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=for-the-badge&logo=solidity)](https://soliditylang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](./LICENSE)

---

## 🌟 Overview

**UniPayQR** bridges the gap between cryptocurrency and everyday payments in India. Users lock **mUSD** (Bitcoin-backed stablecoin) in a smart contract escrow, and local **solvers** handle the actual UPI payment to merchants. Once confirmed, the solver receives the mUSD from escrow.

### **Why UniPayQR?**
- 🏦 **No Merchant Integration** - Works with any UPI-enabled merchant
- 🔒 **Secure Escrow** - Funds locked in smart contracts until confirmed
- 🤖 **AI Matching** - Automatic solver assignment based on location & reputation
- ⚡ **Fast Settlements** - Sub-minute payment confirmations
- 💎 **Bitcoin-Backed** - mUSD is fully backed by Bitcoin on Mezo L2

---

## 🎯 Key Features

### **For Users**
- 📱 Scan merchant QR codes or enter UPI manually
- 💰 Pay with mUSD, merchant receives INR via UPI
- 🔍 Real-time payment tracking
- ✅ Confirm payment before releasing escrow

### **For Solvers**
- 🎖️ 5-tier system with competitive fees (Free to Premium)
- 📊 Reputation tracking and success rates
- 💸 Earn fees on every transaction
- 🌍 Location-based matching for efficiency

### **Smart Contract Features**
- 🔐 Non-custodial escrow system
- ⏰ Auto-expiry and refunds
- 🚫 Cancel protection (can't cancel after solver acts)
- 📈 Dynamic platform fees based on solver tier

---

## 🏗️ Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   User      │────────▶│  Smart       │◀────────│   Solver     │
│   (mUSD)    │         │  Contracts   │         │   (UPI)      │
└─────────────┘         └──────────────┘         └──────────────┘
                               │
                               │
                        ┌──────▼──────┐
                        │  AI Matching │
                        │   Backend    │
                        └─────────────┘
```

### **Components**

1. **Smart Contracts** (Solidity)
   - `MUSDPaymentFactory.sol` - Payment creation, escrow, settlement
   - `SolverRegistry.sol` - Solver registration, tiering, reputation

2. **Frontend** (Next.js 14 + React)
   - Modern UI with glassmorphism design
   - WalletConnect integration
   - QR scanner (camera/gallery/manual)
   - Real-time status updates

3. **Backend** (Node.js + TypeScript)
   - Event listener for new payments
   - AI-powered solver matching
   - Location-based scoring
   - Auto-assignment with retry logic

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+
- Foundry (for contracts)
- Mezo Testnet wallet with mUSD

### **1. Clone Repository**
```bash
git clone https://github.com/YOUR_USERNAME/UniPayQR.git
cd UniPayQR
```

### **2. Install Dependencies**
```bash
# Install contract dependencies
cd contracts && forge install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..
```

### **3. Configure Environment**

**Backend** (`backend/.env`):
```bash
PRIVATE_KEY=your_private_key
RPC_URL=your_mezo_rpc_url
PAYMENT_FACTORY_ADDRESS=deployed_factory_address
SOLVER_REGISTRY_ADDRESS=deployed_registry_address
MUSD_ADDRESS=0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503
```

**Frontend** (`frontend/.env.local`):
```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_RPC_URL=your_mezo_rpc_url
NEXT_PUBLIC_PAYMENT_FACTORY_ADDRESS=deployed_factory_address
NEXT_PUBLIC_SOLVER_REGISTRY_ADDRESS=deployed_registry_address
NEXT_PUBLIC_MUSD_ADDRESS=0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503
```

### **4. Deploy Contracts** (If Needed)
```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --legacy
```

### **5. Run Application**

**Terminal 1 - Backend**:
```bash
cd backend
npm start
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

**Visit**: http://localhost:3000

---

## 💡 How It Works

### **Payment Flow**

```
1️⃣ User creates payment
   ↓
   Lock mUSD in smart contract escrow
   
2️⃣ Backend AI matches best solver
   ↓
   Based on: location, success rate, fees, volume limits
   
3️⃣ Solver receives notification
   ↓
   Pays merchant via UPI
   ↓
   Marks payment as complete (submits proof)
   
4️⃣ User confirms receipt
   ↓
   Checks with merchant
   ↓
   Confirms payment in app
   
5️⃣ Escrow releases funds
   ↓
   Solver receives mUSD
   ↓
   Platform fee deducted
   ↓
   ✅ Transaction complete!
```

---

## 🎨 Screenshots

### Landing Page
Modern, clean design with glassmorphism effects
- Connect wallet
- Choose user or solver path
- Live on Mezo Testnet indicator

### User Dashboard
- mUSD balance display
- Create new payments
- Payment history with status tracking
- Transaction analytics

### Solver Dashboard
- Tier information and stats
- Incoming payment requests
- Success rate tracking
- Monthly volume limits

### Payment Creation
- QR scanner (camera/gallery/manual UPI)
- Amount input with validation
- Real-time mUSD approval
- Transaction confirmation

---

## 🏆 Solver Tier System

| Tier | Stake | Fee | Monthly Limit | Platform Fee |
|------|-------|-----|---------------|--------------|
| **Free** | 0 mUSD | 0.5% | ₹10,000 | 0.20% |
| **Tier 1** | 100 mUSD | 0.75% | ₹50,000 | 0.20% |
| **Tier 2** | 500 mUSD | 1% | ₹2 Lakhs | 0.20% |
| **Tier 3** | 1000 mUSD | 1.5% | ₹5 Lakhs | 0.10% |
| **Tier 4** | 10000 mUSD | 2% | Unlimited | 0.10% |

---

## 🔐 Security Features

- ✅ **Smart Contract Audited Logic**
  - ReentrancyGuard on all transfers
  - SafeMath for overflow protection
  - Ownable access control

- ✅ **Escrow Protection**
  - Funds locked until user confirms
  - Can't cancel after solver submits proof
  - Auto-expiry refunds (1 hour timeout)

- ✅ **Solver Reputation**
  - Success rate tracking
  - Failed payment penalties
  - Stake-based trust system

---

## 🛠️ Tech Stack

### **Blockchain**
- **Solidity** ^0.8.20
- **OpenZeppelin** (Security contracts)
- **Foundry** (Development & deployment)
- **Mezo L2** (Bitcoin-backed layer 2)

### **Frontend**
- **Next.js** 14 (App Router)
- **React** 18
- **TypeScript**
- **Wagmi** & **Viem** (Ethereum interactions)
- **RainbowKit** (Wallet connection)
- **Zustand** (State management)
- **TailwindCSS** (Styling)
- **HTML5-QRCode** (QR scanning)

### **Backend**
- **Node.js** 18+
- **TypeScript**
- **Ethers.js** v6 (Contract interactions)
- **tsx** (TypeScript execution)

---

## 📦 Project Structure

```
UniPayQR/
├── contracts/              # Smart contracts
│   ├── src/
│   │   ├── MUSDPaymentFactory.sol
│   │   └── SolverRegistry.sol
│   ├── script/
│   │   └── Deploy.s.sol
│   └── foundry.toml
│
├── frontend/               # Next.js app
│   ├── app/
│   │   ├── page.tsx       # Landing page
│   │   ├── dashboard/     # User dashboard
│   │   ├── scan/          # QR scanner
│   │   ├── create-payment/# Payment creation
│   │   ├── payment/[id]/  # Payment details
│   │   └── solver/        # Solver pages
│   ├── lib/
│   │   ├── contracts.ts   # Contract ABIs & addresses
│   │   ├── types.ts       # TypeScript types
│   │   └── validation.ts  # Input validation
│   └── hooks/
│       └── useMUSD.ts     # mUSD token hook
│
├── backend/                # Matching service
│   └── matchingService.ts  # Event listener & AI matching
│
└── README.md
```

---

## 🌐 Deployment

### **Smart Contracts**
Already deployed on Mezo Testnet:
- **PaymentFactory**: `0x48956982ec190A688585fcB2A123f160C6226CA2`
- **SolverRegistry**: `0xf6E9364090bccB6e7dB82beFe7413005510D3ca3`
- **mUSD Token**: `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`

### **Backend**
Deploy to Railway/Render/Heroku:
```bash
# Set environment variables
# Deploy from GitHub repo
# Start command: npm start
```

### **Frontend**
Deploy to Vercel:
```bash
# Connect GitHub repo
# Root directory: frontend
# Framework: Next.js
# Environment variables from .env.local.example
```

---

## 🧪 Testing

### **Manual Testing**

1. **Connect Wallet**
   ```
   Visit app → Connect Wallet → Approve Mezo Testnet
   ```

2. **Register as Solver** (Optional)
   ```
   Solver Onboarding → Select Tier → Approve & Register
   ```

3. **Create Payment**
   ```
   Dashboard → New Payment → Scan/Enter UPI → Enter Amount → Sign
   ```

4. **Complete Payment**
   ```
   Solver: Mark Complete → User: Confirm → Done!
   ```

### **Contract Testing**
```bash
cd contracts
forge test -vvv
```

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

---

## 🔗 Links

- **Live App**: [Coming Soon]
- **Block Explorer**: https://explorer.mezo.org
- **Mezo Docs**: https://docs.mezo.org
- **mUSD Token**: https://mezo.org/musd

---

## 📞 Support

For issues, questions, or feedback:
- Open an issue on GitHub
- Contact: [Your Email/Discord]

---

## 🙏 Acknowledgments

- **Mezo Protocol** - For the Bitcoin-backed L2 infrastructure
- **OpenZeppelin** - For secure smart contract libraries
- **Vercel** - For frontend hosting
- **Railway** - For backend hosting

---

<div align="center">

**Built with ❤️ for the Mezo Ecosystem**

⭐ Star this repo if you find it useful!

</div>
