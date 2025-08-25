# Utribe Portal V2 
## Overview

Utribe Portal V2 is a Vue.js-based web application for managing our digital gold token (GIFT) on the polygon networks. It provides a comprehensive platform for purchasing, trading, and managing gold-backed cryptocurrency tokens with integrated wallet connectivity and KYC verification.

## Architecture

### Technology Stack

- **Frontend Framework**: Vue 3 with Composition API
- **Build Tool**: Vite
- **UI Framework**: PrimeVue 4.x with TailwindCSS
- **State Management**: Pinia with persistence
- **Blockchain Integration**: Wagmi/Viem for Ethereum-compatible networks
- **Wallet Connection**: Web3Modal, WalletConnect v2
- **Authentication**: JWT-based with Web3 signature verification
- **Charts**: Chart.js for data visualization
- **PWA Support**: Vite PWA plugin

### Supported Networks

- Polygon (Primary)

```

## Authentication Flow

### 1. Wallet Connection
- Users connect via Web3Modal (MetaMask, WalletConnect, etc.)
- System detects wallet address and chain

### 2. Web3 Authentication
- Generate nonce from backend
- User signs message with wallet
- Exchange signature for JWT token

### 3. Profile Verification
- Check user registration status
- Redirect to profile creation if needed
- Verify KYC status for restricted operations

### 4. Session Management
- JWT tokens stored in session storage
- Automatic token expiry handling
- Admin role detection from JWT claims

## Smart Contract Integration

### Contract Addresses (Environment Variables)

- `VITE_GIFT_CONTRACT`: GIFT token contract
- `VITE_USDC_CONTRACT`: USDC token contract  
- `VITE_USDT_CONTRACT`: USDT token contract
- `VITE_SWAP_CONTRACT`: Token swap contract
- `VITE_POR_CONTRACT`: Proof of Reserve contract
- `VITE_MINTING_CONTRACT`: Token minting contract
- `VITE_LP_CONTRACT`: Liquidity pool contract

### Key Operations

#### Token Operations
```javascript
// Token balance checking
const balance = await wagmiServices.getBalance(address, tokenType);

// Token approvals
await wagmiServices.approveToken(tokenType, spenderContract, amount);

// Token transfers
await wagmiServices.transferTokens(tokenType, recipient, amount);
```

#### Swap Operations
```javascript
// Swap tokens
await wagmiServices.swapTokens(fromToken, toToken, amount);

// Get swap rates
const rate = await wagmiServices.getSwapRate(fromToken, toToken);
```

## API Response Formats

### Standard Response Structure
```javascript
// Success Response
{
  "status": "success",
  "data": { ... },
  "message": "Operation completed"
}

// Error Response  
{
  "status": "error",
  "error": "Error description",
  "message": "User-friendly message"
}
```

### User Profile Response
```javascript
{
  "uid": "user_id",
  "walletAddress": "0x...",
  "registered": "verified|pending|unverified",
  "email": "user@example.com",
  "country": "US",
  "timestamp": "2024-01-01T00:00:00Z",
  "kycStatus": "approved|pending|rejected"
}
```

### Token Price Response
```javascript
{
  "price": 1850.50,
  "currency": "USD",
  "timestamp": "2024-01-01T00:00:00Z",
  "change24h": 2.5,
  "volume24h": 1000000
}
```

## Error Handling

### Common Error Types
- `UserRejectedRequestError`: Wallet interaction rejected
- `ChainMismatchError`: Wrong blockchain network
- `InsufficientFundsError`: Insufficient token balance
- `TokenExpiredError`: JWT token expired
- `KYCRequiredError`: KYC verification needed

