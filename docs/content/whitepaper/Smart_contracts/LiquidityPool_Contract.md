
# Liquidity Pool Documentation

## Overview

The LiquidityPool is a secure, upgradeable smart contract designed to manage token liquidity for the GIFT ecosystem. It handles multiple tokens, including the GIFT token and stablecoins (USDC and USDT), with robust access control mechanisms, recovery options, and monitoring features.

Current Deployment:

* Mainnet Address: 0x4052b46217234c54651b9C487BE3a9C30cc0B1f8
* Admin: Ubuntu Gnosis Safe Multisig

## Key Features

* Multi-token Support: Manages GIFT token, USDC, USDT, and additional whitelisted tokens
* Role-based Access Control: Granular permissions for various operations
* Liquidity Threshold Monitoring: Automatic alerts when liquidity falls below thresholds
* Upgradeable Architecture: UUPS proxy pattern for future improvements
* Emergency Functions: Recovery mechanisms for mistakenly sent tokens
* Pausable Operations: Circuit breaker pattern for emergency situations

## Contract Architecture

The LiquidityPool implements multiple security patterns from OpenZeppelin:

* AccessControlUpgradeable: Role-based permissions
* ReentrancyGuardUpgradeable: Protection against reentrancy attacks
* PausableUpgradeable: Circuit breaker pattern
* UUPSUpgradeable: Proxy upgradeability
* SafeERC20Upgradeable: Safe token transfer handling

# Roles and Permissions

The contract implements several roles with specific permissions:

| Role | Description | Default Holder | Functions |
| --- | --- | --- | --- |
| DEFAULT_ADMIN_ROLE | Administrative operations | Admin | pause, unpause, transferAdminRole, withdrawStablecoins, withdrawSpecificStablecoin, withdrawGift, setLiquidityThreshold, setPriceManager, setWhitelist, addSwappableToken, removeSwappableToken, setTokenSwapContract, addThirdParty, removeThirdParty |
| RECOVERY_ROLE | Emergency recovery | Admin | recoverERC20 |
| UPGRADER_ROLE | Contract upgrades | Admin | _authorizeUpgrade (internal) |
| LIQUIDITY_PROVIDER_ROLE | Add/Remove liquidity | Granted as needed | addLiquidity, removeLiquidity (with additional authorization) |
| PREMIUM_MANAGER_ROLE | Manage premium settings | - | - |
| TOKEN_SWAP_ROLE | TokenSwap contract operations | - | removeLiquidity (with LIQUIDITY_PROVIDER_ROLE) |
| THIRD_PARTY_ROLE | Authorized third parties | - | removeLiquidity (with LIQUIDITY_PROVIDER_ROLE) |

# Liquidity Management

## Adding Liquidity

```javascript
function addLiquidity(address _token, uint256 _amount) external
```

Allows whitelisted liquidity providers to add tokens to the pool. The token must be GIFT, USDC, USDT, or another whitelisted token.

Requirements:
* Caller must be whitelisted
* Caller must have LIQUIDITY_PROVIDER_ROLE
* Contract must not be paused

Effects:
* Transfers tokens from caller to contract
* Updates liquidity tracking
* Emits LiquidityAdded event
* May reset threshold triggers if applicable

## Removing Liquidity

```javascript
function removeLiquidity(address _token, uint256 _amount) external
```

Allows authorized parties to remove liquidity from the pool.

Requirements:
* Caller must be whitelisted
* Caller must have LIQUIDITY_PROVIDER_ROLE
* Caller must have one of: DEFAULT_ADMIN_ROLE, RECOVERY_ROLE, TOKEN_SWAP_ROLE, or THIRD_PARTY_ROLE
* Requested amount must not exceed available liquidity
* Contract must not be paused

Effects:
* Transfers tokens from contract to caller
* Updates liquidity tracking
* Emits LiquidityRemoved event
* Checks threshold conditions

# Withdrawing Tokens

The contract provides several functions for admins to withdraw tokens:

```javascript
function withdrawStablecoins(uint256 _amount) external
```

Withdraws stablecoins (USDC and USDT) in equal proportions.

```javascript
function withdrawSpecificStablecoin(address _token, uint256 _amount) external
```

Withdraws a specific stablecoin (either USDC or USDT).

```javascript
function withdrawGift(uint256 _amount) external
```

Withdraws GIFT tokens.

Requirements:
* Caller must have DEFAULT_ADMIN_ROLE
* Requested amount must not exceed available liquidity
* Contract must not be paused

Effects:
* Transfers tokens from contract to caller
* Updates liquidity tracking
* Emits appropriate event
* Checks threshold conditions

# Threshold Monitoring

The contract monitors liquidity levels against configurable thresholds:

```javascript
function setLiquidityThreshold(address _token, uint256 _threshold) external
```

Sets a threshold for a specific token.

```javascript
function checkLiquidityThreshold(address _token) internal
```

Checks if liquidity falls below threshold and emits events if necessary.

Events:
* LiquidityThresholdAlert: Emitted whenever liquidity is checked and is below threshold
* ThresholdTriggered: Emitted only once when liquidity crosses from above to below threshold
* ThresholdReset: Emitted when liquidity returns above threshold

# Emergency Functions

## Token Recovery

```javascript
function recoverERC20(address _token, address _recipient, uint256 _amount) external
```

Allows recovery of tokens that were accidentally sent to the contract or are not part of the tracked liquidity.

Requirements:
* Caller must have RECOVERY_ROLE
* Cannot recover tracked liquidity

Effects:
* Transfers tokens from contract to recipient
* Emits TokensRecovered event

## Pausing Operations

```javascript
function pause() external
function unpause() external
```

Allows admins to pause and unpause all state-changing operations in case of emergencies.

Requirements:
* Caller must have DEFAULT_ADMIN_ROLE

Effects:
* Prevents all functions with whenNotPaused modifier from executing
* Emits ContractPaused or ContractUnpaused event

# Role Management

```javascript
function transferAdminRole(address newAdmin) external
```

Transfers the admin role to a new address.

```javascript
function setTokenSwapContract(address _tokenSwapContract) external
```

Grants TOKEN_SWAP_ROLE and LIQUIDITY_PROVIDER_ROLE to the TokenSwap contract.

```javascript
function addThirdParty(address _thirdParty) external
function removeThirdParty(address _thirdParty) external
```

Adds or removes authorized third parties.

# Configuration Functions

```javascript
function setPriceManager(address _priceManager) external
function setWhitelist(address _whitelist) external
```

Updates contract dependencies.

```javascript
function addSwappableToken(address _token) external
function removeSwappableToken(address _token) external
```

Manages the list of swappable tokens.

# Events

| Event | Description |
| --- | --- |
| LiquidityAdded | Emitted when liquidity is added |
| LiquidityRemoved | Emitted when liquidity is removed |
| GiftPriceChanged | Emitted when GIFT price is updated |
| StablecoinsWithdrawn | Emitted when stablecoins are withdrawn |
| LiquidityThresholdAlert | Emitted when liquidity falls below threshold |
| ThresholdTriggered | Emitted when liquidity first crosses below threshold |
| ThresholdReset | Emitted when liquidity returns above threshold |
| TokensRecovered | Emitted when tokens are recovered |
| ContractPaused | Emitted when contract is paused |
| ContractUnpaused | Emitted when contract is unpaused |
| GiftWithdrawn | Emitted when GIFT tokens are withdrawn |
| StablecoinWithdrawn | Emitted when a specific stablecoin is withdrawn |

# Security Considerations

1. Role Management: Be careful when granting roles, especially DEFAULT_ADMIN_ROLE and RECOVERY_ROLE. It's recommended to use a multi-signature wallet for these roles in production.
2. Liquidity Removal: Only authorized parties can remove liquidity, protecting against unauthorized withdrawals.
3. Upgrades: Contract upgrades are controlled by the UPGRADER_ROLE. Any upgrades should be thoroughly tested and audited.
4. Token Recovery: The recoverERC20 function prevents recovery of tracked liquidity, ensuring user funds remain secure.

# Integration Guide

## For Liquidity Providers

1. Request whitelisting from the contract administrator
2. Request the LIQUIDITY_PROVIDER_ROLE from the administrator
3. Call addLiquidity(token, amount) to provide liquidity

## For Token Swap Integration

1. Deploy the TokenSwap contract
2. Have the admin call setTokenSwapContract(tokenSwapAddress) on the LiquidityPool
3. The TokenSwap contract can now call removeLiquidity(token, amount)

# Technical Parameters

| Parameter | Value | Description |
| --- | --- | --- |
| Solidity Version | ^0.8.25 | Compiler version |
| EIP Compatibility | EIP-1967, EIP-2535 | Implemented standards |
| Proxy Pattern | UUPS | Upgradeability pattern |
| License | MIT | Open source license |

# For More Information

For questions, support, or partnership inquiries, please contact:

* Email: kassy@utribe.one
