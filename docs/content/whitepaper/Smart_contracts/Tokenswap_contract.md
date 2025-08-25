
# TokenSwap Documentation

## Overview

The TokenSwap contract is a secure, upgradeable smart contract designed to facilitate token swaps in the GIFT ecosystem. It enables users to exchange stablecoins (USDC, USDT) for GIFT tokens and vice versa, with configurable fees distributed to designated beneficiaries. The contract implements regulatory checks, fee management, and robust security measures.

Current Deployment:

* Mainnet Address: 0x5002A5eCE43A54872D71fDfE418F32Af341814Ae
* Admin : Ubuntu Gnosis Safe Multisig

## Key Features

* Token Swapping: Exchange stablecoins for GIFT tokens and vice versa
* Fee Management: Configurable fee percentage with multiple beneficiaries
* Regulatory Compliance: Integration with regulatory checker for swap validation
* Proxy Pattern: UUPS upgradeable design for future improvements
* Role-Based Access: Granular permissions for administrative functions
* Circuit Breaker: Ability to pause entire contract or specific tokens
* Recovery Mechanism: Emergency token recovery functionality

# Contract Architecture

The TokenSwap implements multiple security patterns from OpenZeppelin:

* AccessControlUpgradeable: Role-based permissions
* ReentrancyGuardUpgradeable: Protection against reentrancy attacks
* PausableUpgradeable: Circuit breaker pattern
* UUPSUpgradeable: Proxy upgradeability
* SafeERC20Upgradeable: Safe token transfer handling

# Roles and Permissions

| Role | Description | Default Holder | Functions |
| --- | --- | --- | --- |
| DEFAULT_ADMIN_ROLE | Administrative operations | Admin | setAdmin, addSwappableToken, removeSwappableToken, setTokenPaused, setPriceManager, setRegulatoryChecker, setLiquidityPool, setTrustedAddress, pause, unpause |
| FEE_MANAGER_ROLE | Fee configuration | Admin | toggleFees, setDefaultFeePercentage, addBeneficiary, updateBeneficiary, removeBeneficiary |
| UPGRADER_ROLE | Contract upgrades | Admin | _authorizeUpgrade (internal) |
| RECOVERY_ROLE | Emergency recovery | Admin | recoverERC20 |

# Fee System

The TokenSwap implements a flexible fee system with the following features:

* Configurable Fee Percentage: Set up to 5% (500 basis points) fee
* Multiple Beneficiaries: Support for multiple fee recipients with different percentages
* Fee Toggle: Enable or disable fees entirely
* Unused Fee Handling: Return unused fees to the liquidity pool

## Beneficiary Management

```javascript
function addBeneficiary(address _beneficiary, uint256 _percentage) external
function updateBeneficiary(uint256 _index, address _beneficiary, uint256 _percentage) external
function removeBeneficiary(uint256 _index) external
function getBeneficiaryCount() external view returns (uint256)
```

Fee Calculation:

* Fees are calculated as a percentage of the output amount
* Percentages are specified in basis points (100 = 1%)
* Total beneficiary percentage cannot exceed 5% (500 basis points)

# Regulatory Compliance

The TokenSwap integrates with the RegulatoryChecker contract to ensure all swaps comply with regulatory requirements. This comprehensive system performs multiple checks before allowing any swap to proceed.

# Regulatory Checks

For each swap, the TokenSwap calls `performRegulatoryCheck()` which makes a call to the RegulatoryChecker's `validateSwap()` function, which performs the following validations:

1. Whitelist Check: Verifies the user is on an approved whitelist
2. KYC Level Check: Validates the user's KYC level and enforces appropriate limits
3. AML Check: For large transactions, performs anti-money laundering verification

## KYC Tiers and Limits

The RegulatoryChecker enforces different swap limits based on a user's KYC status:

* Non-KYC'd Users: Limited to a lifetime swap balance of $1,000 USD
* KYC'd Users: Each KYC level has its own swap limit, with higher levels allowing larger transactions

## Trusted Addresses

Certain addresses can be designated as "trusted" via the `setTrustedAddress()` function:

```javascript
function setTrustedAddress(address _address, bool _isTrusted) external
```

Trusted addresses:

* Bypass regulatory checks when performing swaps
* Can perform swaps on behalf of users using `swapTokensForRecipient()` and `swapGiftForRecipient()`

# Regulatory Administration

The RegulatoryChecker contract has its own role-based permissions system:

* DEFAULT_ADMIN_ROLE: Can transfer admin role and manage regulatory admins
* REGULATORY_ADMIN_ROLE: Can toggle checks, update contract addresses, and pause/unpause the contract
* UPGRADER_ROLE: Can authorize contract upgrades

## Error Handling

When a regulatory check fails, the contract:

1. Returns an error code and detailed reason
2. Prevents the swap from proceeding
3. Emits a `SwapRejected` event with information about the failure

## Compliance Flow

1. User initiates swap via TokenSwap contract
2. TokenSwap calls RegulatoryChecker's `validateSwap()` function
3. RegulatoryChecker performs whitelist, KYC, and AML checks
4. If all checks pass, the swap proceeds
5. If any check fails, the transaction reverts with a detailed error message

# Swap Operations

## Standard Swaps

```javascript
function swapTokens(address _token, uint256 _amountIn, address _recipient) external
function swapGift(address _token, uint256 _amountIn, address _recipient) external
```

Standard swaps allow users to exchange:

* Stablecoins for GIFT tokens (`swapTokens`)
* GIFT tokens for stablecoins (`swapGift`)

Both functions:

* Perform regulatory checks
* Apply fees if enabled
* Allow specifying a recipient address

## Trusted Swaps

```javascript
function swapTokensForRecipient(address _token, uint256 _amountIn, address _user, address _recipient) external
function swapGiftForRecipient(address _token, uint256 _amountIn, address _user, address _recipient) external
```

Trusted swaps allow whitelisted addresses to perform swaps on behalf of users:

* Only callable by addresses with `trustedAddresses[address] = true`
* Perform regulatory checks on the recipient
* Apply fees if enabled
* Record the original user in events

# Token Management

## Swappable Tokens

```javascript
function addSwappableToken(address _token) external
function removeSwappableToken(address _token) external
```

The contract maintains a list of tokens that can be swapped:

* Stablecoins (USDC, USDT)
* GIFT token
* Any other token added by an admin

## Token Pausing

```javascript
function setTokenPaused(address _token, bool _paused) external
```

Admins can pause specific tokens without pausing the entire contract:

* Prevents swapping a specific token
* Useful for addressing issues with individual tokens

# Security Features

## Pause/Unpause

```javascript
function pause() external
function unpause() external
```

The entire contract can be paused in emergency situations:

* Prevents all swap operations
* Only callable by DEFAULT_ADMIN_ROLE

## Token Recovery

```javascript
function recoverERC20(address _token, address _recipient, uint256 _amount) external
```

Emergency function to recover tokens mistakenly sent to the contract:

* Only callable by RECOVERY_ROLE
* Can recover any ERC20 token

# Integration With External Contracts

The TokenSwap integrates with three external contracts:

1. LiquidityPool: Provides liquidity for swaps

```javascript
function setLiquidityPool(address _liquidityPool) external
```

2. PriceManager: Provides GIFT token price information

```javascript
function setPriceManager(address _priceManager) external
```

3. RegulatoryChecker: Validates swap compliance

```javascript
function setRegulatoryChecker(address _regulatoryChecker) external
```


# Events

| Event | Description |
| --- | --- |
| TokensSwapped | Emitted when tokens are swapped |
| DefaultFeeUpdated | Emitted when default fee percentage is updated |
| BeneficiaryAdded | Emitted when a beneficiary is added |
| BeneficiaryRemoved | Emitted when a beneficiary is removed |
| BeneficiaryUpdated | Emitted when a beneficiary is updated |
| FeesToggled | Emitted when fees are enabled/disabled |
| ContractPaused | Emitted when contract is paused |
| ContractUnpaused | Emitted when contract is unpaused |
| TokenAddressUpdated | Emitted when a token address is updated |
| TrustedAddressChanged | Emitted when a trusted address is added/removed |
| TokensRecovered | Emitted when tokens are recovered |
| TokenPauseStatusChanged | Emitted when a token's pause status is changed |

# Swap Process Flow

## Swapping Stablecoins to GIFT

1. User calls `swapTokens(stablecoin, amount, recipient)`
2. Contract performs regulatory check on user
3. Contract transfers stablecoins from user to liquidity pool
4. Contract calculates GIFT amount based on price from PriceManager
5. Contract calculates fee amount if fees are enabled
6. Contract removes GIFT tokens from liquidity pool
7. Contract sends GIFT tokens to recipient (minus fees)
8. Contract distributes fees to beneficiaries
9. Contract emits `TokensSwapped` event

## Swapping GIFT to Stablecoins

1. User calls `swapGift(stablecoin, amount, recipient)`
2. Contract performs regulatory check on user
3. Contract transfers GIFT tokens from user to liquidity pool
4. Contract calculates stablecoin amount based on price from PriceManager
5. Contract calculates fee amount if fees are enabled
6. Contract removes stablecoins from liquidity pool
7. Contract sends stablecoins to recipient (minus fees)
8. If fees are enabled, contract converts fee amount to GIFT tokens
9. Contract distributes GIFT fees to beneficiaries
10. Contract emits `TokensSwapped` event

# Security Considerations

1. Role Management: Be careful when granting roles, especially `DEFAULT_ADMIN_ROLE` and `RECOVERY_ROLE`. It's recommended to use a multi-signature wallet for these roles in production.
2. Fee Configuration: The total fee is capped at 5%, but ensure beneficiary percentages are set correctly to prevent unexpected behavior.
3. Trusted Addresses: Only grant trusted status to thoroughly vetted addresses, as they can bypass regulatory checks.
4. Upgrades: Contract upgrades are controlled by the `UPGRADER_ROLE`. Any upgrades should be thoroughly tested and audited.
5. External Contracts: The contract relies on external contracts for liquidity, pricing, and regulatory checks. Ensure these contracts are secure and correctly implemented.

# Integration Guide

## For Users

1. Ensure you have the necessary tokens (GIFT or stablecoins)
2. Approve the TokenSwap contract to spend your tokens
3. Call `swapTokens` or `swapGift` with the desired parameters

## For Beneficiaries

1. Request to be added as a beneficiary by the fee manager
2. Once added, you will automatically receive your share of fees

## For Trusted Entities

1. Request to be added as a trusted address by the admin
2. Once added, you can call `swapTokensForRecipient` or `swapGiftForRecipient` on behalf of users

## Compliance Requirements

To comply with regulatory requirements, users should:

1. Ensure they are whitelisted in the system
2. Complete KYC verification to increase their swap limits
3. Be aware that large transactions may trigger AML checks
4. Understand that their swap activity is monitored and subject to regulatory oversight

# Technical Parameters

| Parameter | Value | Description |
| --- | --- | --- |
| Solidity Version | ^0.8.24 | Compiler version |
| EIP Compatibility | EIP-1967, EIP-2535 | Implemented standards |
| Proxy Pattern | UUPS | Upgradeability pattern |
| License | MIT | Open source license |
| Default Fee | 500 basis points (5%) | Initial fee setting |

# For More Information

For questions, support, or partnership inquiries, please contact:

* Email: kassy@utribe.one
