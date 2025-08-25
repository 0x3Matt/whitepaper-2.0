# RegulatoryChecker Contract Documentation

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

// Interface definitions for the regulatory modules
interface IWhitelist {
    function isWhitelisted(address _address) external view returns (bool);
}

interface IKYC {
    function getKYCLevel(address _account) external view returns (uint256);
    function getKYCLevels() external view returns (KYCLevel[] memory);
}

interface IAMLChecker {
    function requestAMLCheck(
        address _sender,
        address _recipient,
        uint256 _amount,
        address _tokenAddress
    ) external returns (bytes32);

    function checkRequestStatus(bytes32 _requestId)
        external
        view
        returns (
            bool exists,
            bool approved,
            bool processed
        );

    function amlThreshold() external view returns (uint256);
}

// Structure mirroring the KYC contract's KYCLevel
struct KYCLevel {
    string name;
    uint256 swapLimit;
}

/**
 * @title RegulatoryChecker
 * @dev Contract for centralized regulatory checks including KYC, Whitelist, and AML
 */
contract RegulatoryChecker is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    // Role definitions
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant REGULATORY_ADMIN_ROLE =
        keccak256("REGULATORY_ADMIN_ROLE");

    // Addresses of regulatory contracts
    IWhitelist public whitelist;
    IKYC public kyc;
    IAMLChecker public aml;

    // Toggle switches for each module
    bool public isWhitelistEnabled;
    bool public isKycEnabled;
    bool public isAmlEnabled;

    mapping(address => uint256) public noKycSwapBalances;

    // Error codes and reasons for each check
    mapping(uint8 => string) public errorReasons;

    // Events
    event NoKycSwapBalanceUpdated(address indexed user, uint256 newBalance);
    event SwapAllowed(address indexed user, uint256 amount, address token);
    event SwapRejected(string module, string reason);
    event ModuleToggled(string module, bool enabled);
    event ModuleAddressUpdated(string module, address newAddress);
    event DefaultAdminTransferred(
        address indexed oldAdmin,
        address indexed newAdmin
    );
    event RegulatoryAdminAdded(address indexed account);
    event RegulatoryAdminRemoved(address indexed account);

    // Contract implementation...
}
```

## Contract Addresses 
> Polygon Mainnet  
Implementation: 0x20ED2716De26729e18d718E05aDb58586e10919D
Proxy: 0x114e074cb39d4D56Ee2Bc2952bF79c4Fd72f1a0B



## Overview

The RegulatoryChecker contract serves as a unified gateway for regulatory compliance in token swap operations. It integrates three essential compliance modules:

1. **Whitelist Verification**: Ensures users are approved to use the platform
2. **KYC Level Checks**: Enforces transaction limits based on user KYC levels
3. **AML Verification**: Performs Anti-Money Laundering checks for transactions above a defined threshold

This contract provides a single validation point for all regulatory requirements, simplifying integration with other contracts and enabling centralized compliance management.

## Key Features

- **Modular Design**: Each regulatory check can be enabled or disabled independently
- **Tiered KYC Enforcement**: Enforces different transaction limits based on KYC levels
- **Non-KYC User Support**: Allows limited transactions for non-KYC users with lifetime limits
- **Flexible AML Integration**: Configurable threshold for AML checks
- **Comprehensive Access Control**: Role-based permissions for administrative functions
- **Upgradeable Architecture**: UUPS pattern allows future improvements without migration

## How It Works

### 1. Validation Process

When a token swap is initiated, the `validateSwap` function performs a series of checks:

```solidity
function validateSwap(
    address user,
    uint256 amount,
    address token
)
    external
    whenNotPaused
    returns (
        bool allowed,
        uint8 code,
        string memory reason
    )
{
    // Perform whitelist, KYC, and AML checks
    // Return validation result
}
```

The function returns:
- `allowed`: Boolean indicating if the swap is permitted
- `code`: Error code if validation fails (0 if successful)
- `reason`: Human-readable error message if validation fails

### 2. Whitelist Verification

The contract first checks if the user's address is included in the whitelist. This verification can be disabled by setting `isWhitelistEnabled` to false.

### 3. KYC Level Enforcement

The contract enforces transaction limits based on the user's KYC level:

- **KYC'd Users**: Each KYC level has a specific transaction limit defined in the KYC contract
- **Non-KYC Users**: A lifetime limit of 1,000 USD (tracked in the `noKycSwapBalances` mapping)

### 4. AML Verification

For transactions exceeding the AML threshold, the contract requests an AML check from the AML service:

```
if (isAmlEnabled && amount >= aml.amlThreshold()) {
    bytes32 requestId = aml.requestAMLCheck(user, address(0), amount, token);
    (bool exists, bool approved, bool processed) = aml.checkRequestStatus(requestId);
    
    if (!exists || !processed || !approved) {
        emit SwapRejected("AML", errorReasons[3]);
        return (false, 3, errorReasons[3]);
    }
}
```

**Note on AML Implementation**: The current AML check is designed to be processed within the same transaction. This approach requires the AML service to provide immediate responses, which may not be realistic for complex AML checks. For production environments, consider implementing an asynchronous pattern where:

1. Initial transaction creates an AML request
2. Off-chain service processes the AML check
3. A separate transaction completes the swap after AML approval


### Administration Functions

The contract includes several administrative functions:

1. **Toggle Module Status**:
   ```solidity
   function toggleChecks(bool wl, bool ky, bool am) external onlyRole(REGULATORY_ADMIN_ROLE)
   ```

2. **Update Module Addresses**:
   ```solidity
   function setWhitelist(address _wl) external onlyRole(REGULATORY_ADMIN_ROLE)
   function setKyc(address _kyc) external onlyRole(REGULATORY_ADMIN_ROLE)
   function setAml(address _aml) external onlyRole(REGULATORY_ADMIN_ROLE)
   ```

3. **Update Error Messages**:
   ```solidity
   function updateErrorReason(uint8 _code, string memory _reason) external onlyRole(REGULATORY_ADMIN_ROLE)
   ```

4. **Role Management**:
   ```solidity
   function transferAdminRole(address newAdmin) external onlyRole(DEFAULT_ADMIN_ROLE)
   function addRegulatoryAdmin(address regulatoryAdmin) external onlyRole(DEFAULT_ADMIN_ROLE)
   function removeRegulatoryAdmin(address regulatoryAdmin) external onlyRole(DEFAULT_ADMIN_ROLE)
   ```

## Role Structure

The contract uses OpenZeppelin's AccessControl with three roles:

1. **DEFAULT_ADMIN_ROLE**: Can add/remove other roles and transfer admin privileges
2. **REGULATORY_ADMIN_ROLE**: Can modify regulatory settings and module addresses
3. **UPGRADER_ROLE**: Can authorize contract upgrades via the UUPS pattern

## Error Codes

The contract defines error codes for each type of regulatory check:

- **Code 1**: Whitelist validation failure
- **Code 2**: KYC level insufficient or swap limit exceeded
- **Code 3**: AML check failed or pending

## Events

The contract emits events for all significant actions:

- `NoKycSwapBalanceUpdated`: When a non-KYC user's remaining balance is updated
- `SwapAllowed`: When a swap passes all regulatory checks
- `SwapRejected`: When a swap fails a regulatory check
- `ModuleToggled`: When a regulatory module is enabled or disabled
- `ModuleAddressUpdated`: When a module address is updated
- `DefaultAdminTransferred`: When the admin role is transferred
- `RegulatoryAdminAdded`/`RegulatoryAdminRemoved`: When regulatory admin permissions change

## Security Considerations

1. **Centralized Control**: The contract centralizes regulatory control, which provides efficiency but creates a potential single point of failure
2. **External Contract Dependencies**: The contract relies on external contracts for regulatory checks, so their security directly impacts this contract
3. **AML Implementation**: The synchronous AML check implementation may need revision for production use

## Upgradeability

The contract implements the UUPS (Universal Upgradeable Proxy Standard) pattern, allowing for future upgrades while preserving state and address.

For more help contact: kassy@utribe.one