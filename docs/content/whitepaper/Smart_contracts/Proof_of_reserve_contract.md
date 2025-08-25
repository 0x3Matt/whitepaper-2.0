# **Comprehensive Documentation for the GIFTPoR Smart Contract**

## **Introduction**

The `GIFTPoR` (Proof of Reserve) smart contract is designed to manage and verify the reserves of GIFT tokens, ensuring transparency and trust within the system. It allows for the management of vaults containing reserves, the assignment of auditors, admins, and minters, and provides mechanisms for updating reserves, minting allowances, and transferring supplies between vaults. This documentation provides an in-depth explanation of the contract's architecture, functions, and usage guidelines to assist users in effectively interacting with it.

---

## **Table of Contents**

1. [Contract Overview](#contract-overview)
2. [Roles and Responsibilities](#roles-and-responsibilities)
3. [Data Structures](#data-structures)
   - Structs
   - Mappings
4. [Modifiers](#modifiers)
5. [Events](#events)
6. [Function Explanations](#function-explanations)
   - Initialization Functions
   - Auditor Functions
   - Admin Functions
   - Minter Functions
   - Vault Management Functions
   - Reserve Update Functions
   - Supply Management Functions
   - Utility Functions
7. [Usage Guide](#usage-guide)
   - Step-by-Step Workflow
   - Parameter Specifications
   - Examples
8. [Additional Notes](#additional-notes)
   - Security Measures
   - Important Considerations
9. [Conclusion](#conclusion)

---

## **Contract Overview**

The `GIFTPoR` contract serves as a Proof of Reserve system for GIFT tokens. It manages multiple vaults containing reserves, allows for the secure addition and redemption of physical gold (or other assets backing the GIFT tokens), and facilitates transparency by enabling auditors to verify and update the reserves. The contract also handles roles such as auditors, admins, and minters, each with specific permissions to interact with the system.

---

## **Roles and Responsibilities**

1. **Owner**: The deployer or designated controller of the contract with the highest level of permissions, including adding or removing auditors and admins.

2. **Auditor**: A trusted entity responsible for verifying physical reserves, updating vaults, moving supplies, and ensuring the integrity of the reserve data.

3. **Admin**: An entity with permissions to manage minters, add vaults, set minting allowances, and perform contract upgrades.

4. **Minter**: An entity authorized to mint new GIFT tokens based on available reserves and allowances.

5. **Vault Manager**: Implicitly covered by the admin and auditor roles, responsible for managing vaults and physical reserves.

---

## **Data Structures**

### **Structs**

1. **Vault**

   ```solidity
   struct Vault {
       uint256 id;
       string name;
       uint256 amount;
   }
   ```

   - **id**: Unique identifier for the vault.
   - **name**: Name of the vault.
   - **amount**: The amount of reserves held in the vault (in GIFT tokens).

2. **PhysicalVaultReserve**

   ```solidity
   struct PhysicalVaultReserve {
       uint256 id;
       string name;
       uint256 amount;
   }
   ```

   - **id**: Unique identifier matching the vault ID.
   - **name**: Name of the physical vault.
   - **amount**: The physical amount of the reserve (e.g., gold in grams).

3. **ReserveAllowance**

   ```solidity
   struct ReserveAllowance {
       uint256 reserveId;
       uint256 allowance;
   }
   ```

   - **reserveId**: ID of the reserve.
   - **allowance**: The minting allowance assigned to a minter for the reserve.

### **Mappings**

- **minterReserves**

  ```solidity
  mapping(address => uint256[]) public minterReserves;
  ```

  - Maps a minter's address to a list of reserve IDs they have allowances for.

- **mintAllowances**

  ```solidity
  mapping(address => mapping(uint256 => uint256)) public mintAllowances;
  ```

  - Maps a minter's address and reserve ID to their minting allowance.

- **vaultsById**

  ```solidity
  mapping(uint256 => Vault) public vaultsById;
  ```

  - Maps a vault ID to its corresponding `Vault` struct.

- **physicalVaultsById**

  ```solidity
  mapping(uint256 => PhysicalVaultReserve) public physicalVaultsById;
  ```

  - Maps a vault ID to its corresponding `PhysicalVaultReserve` struct.

- **auditors**, **admins**, **minters**

  ```solidity
  mapping(address => bool) public auditors;
  mapping(address => bool) public admins;
  mapping(address => bool) public minters;
  ```

  - Maps an address to a boolean indicating whether they hold the respective role.

---

## **Modifiers**

Modifiers are conditions applied to functions to restrict access based on roles.

- **onlyOwner**

  ```solidity
  modifier onlyOwner()
  ```

  Ensures that only the owner of the contract can call the function.

- **onlyAuditor**

  ```solidity
  modifier onlyAuditor()
  ```

  Ensures that only an auditor can call the function.

- **onlyAdmin**

  ```solidity
  modifier onlyAdmin()
  ```

  Ensures that only an admin can call the function.

- **onlyMinter**

  ```solidity
  modifier onlyMinter()
  ```

  Ensures that only a minter can call the function.

---

## **Events**

Events are emitted during contract execution to log activity.

- **UpdateReserve**

  ```solidity
  event UpdateReserve(uint256 GIFT_reserve, address indexed sender);
  ```

  - Emitted when the total GIFT reserve is updated.

- **SetMintAllowance**

  ```solidity
  event SetMintAllowance(
      address indexed minter,
      uint256 reserveId,
      uint256 allowance
  );
  ```

  - Emitted when a minting allowance is set for a minter.

- **VaultAdded**

  ```solidity
  event VaultAdded(uint256 indexed vaultId, string name);
  ```

  - Emitted when a new vault is added.

- **AuditorAdded**, **AuditorRemoved**

  ```solidity
  event AuditorAdded(address indexed auditor);
  event AuditorRemoved(address indexed auditor);
  ```

  - Emitted when an auditor is added or removed.

- **AdminAdded**, **AdminRemoved**

  ```solidity
  event AdminAdded(address indexed admin);
  event AdminRemoved(address indexed admin);
  ```

  - Emitted when an admin is added or removed.

- **MinterAdded**, **MinterRemoved**

  ```solidity
  event MinterAdded(address indexed minter);
  event MinterRemoved(address indexed minter);
  ```

  - Emitted when a minter is added or removed.

- **VaultCreated**

  ```solidity
  event VaultCreated(
      uint256 vaultId,
      string vaultName,
      uint256 amountAdded,
      uint256 totalAmount
  );
  ```

  - Emitted when a new vault is created.

- **VaultUpdated**

  ```solidity
  event VaultUpdated(
      uint256 vaultId,
      string vaultName,
      uint256 amountAdded,
      uint256 totalAmount,
      string comment
  );
  ```

  - Emitted when a vault is updated.

- **VaultUpdatedAfterMint**

  ```solidity
  event VaultUpdatedaftermint(
      uint256 vaultId,
      string vaultName,
      uint256 amountAdded,
      uint256 totalAmount
  );
  ```

  - Emitted when a vault is updated after minting.

- **MoveSupply**

  ```solidity
  event MoveSupply(
      uint256 indexed fromVaultId,
      uint256 indexed toVaultId,
      uint256 amount,
      string comment,
      address indexed auditor
  );
  ```

  - Emitted when supply is moved between vaults.

- **PhysicalVaultSupplyAdded**

  ```solidity
  event PhysicalVaultSupplyAdded(
      uint256 indexed vaultId,
      string vaultName,
      uint256 amountAdded,
      uint256 totalAmount,
      string comment,
      address indexed auditor
  );
  ```

  - Emitted when physical supply is added to a vault.

- **PhysicalVaultSupplyRemoved**

  ```solidity
  event PhysicalVaultSupplyRemoved(
      uint256 indexed vaultId,
      string vaultName,
      uint256 amountRemoved,
      uint256 totalAmount,
      string comment,
      address indexed auditor
  );
  ```

  - Emitted when physical supply is removed from a vault.

---

## **Function Explanations**

### **1. Initialization Functions**

#### **initialize**

```solidity
function initialize() public initializer
```

**Purpose**: Initializes the contract, setting up the owner, and assigning the initial auditor, admin, and minter roles to the deployer.

**Usage Notes**:

- Must be called immediately after contract deployment.
- Sets `nextVaultId` to `1`.

---

### **2. Auditor Functions**

#### **addAuditor**

```solidity
function addAuditor(address _auditor) external onlyOwner
```

**Purpose**: Allows the owner to add a new auditor.

**Parameters**:

- `_auditor`: Address of the auditor to be added.

**Usage Notes**:

- Adds the address to the `auditors` mapping.
- Emits `AuditorAdded` event.

---

#### **removeAuditor**

```solidity
function removeAuditor(address _auditor) external onlyOwner
```

**Purpose**: Allows the owner to remove an existing auditor.

**Parameters**:

- `_auditor`: Address of the auditor to be removed.

**Usage Notes**:

- Removes the address from the `auditors` mapping.
- Emits `AuditorRemoved` event.

---

#### **updateVault**

```solidity
function updateVault(
    uint256 _vaultId,
    uint256 _amountAdded,
    string memory comment
) public onlyAuditor
```

**Purpose**: Updates the amount in a vault, typically after verifying and adding new physical reserves.

**Parameters**:

- `_vaultId`: ID of the vault to update.
- `_amountAdded`: Amount to add to the vault's reserve.
- `comment`: Explanation for the update.

**Usage Notes**:

- Updates both the `Vault` and `PhysicalVaultReserve`.
- Increases `GIFT_reserve` by `_amountAdded`.
- Emits `VaultUpdated` and `UpdateReserve` events.

---

#### **SupplyGold**

```solidity
function SupplyGold(
    uint256 vaultId,
    uint256 amount,
    string memory comment
) public onlyAuditor
```

**Purpose**: Adds physical supply to the `PhysicalVaultReserve` of a vault.

**Parameters**:

- `vaultId`: ID of the vault.
- `amount`: Physical amount to add.
- `comment`: Explanation for the addition.

**Usage Notes**:

- Increases the physical amount in `PhysicalVaultReserve`.
- Emits `PhysicalVaultSupplyAdded` event.

---

#### **RedeemGold**

```solidity
function RedeemGold(
    uint256 vaultId,
    uint256 amount,
    string memory comment
) public onlyAuditor
```

**Purpose**: Removes physical supply from the `PhysicalVaultReserve` of a vault.

**Parameters**:

- `vaultId`: ID of the vault.
- `amount`: Physical amount to remove.
- `comment`: Explanation for the removal.

**Usage Notes**:

- Decreases the physical amount in `PhysicalVaultReserve`.
- Emits `PhysicalVaultSupplyRemoved` event.

---

#### **moveSupply**

```solidity
function moveSupply(
    uint256 fromVaultId,
    uint256 toVaultId,
    uint256 amount,
    string memory comment
) external onlyAuditor
```

**Purpose**: Moves supply from one vault to another without changing the total reserve.

**Parameters**:

- `fromVaultId`: ID of the source vault.
- `toVaultId`: ID of the destination vault.
- `amount`: Amount to move.
- `comment`: Explanation for the transfer.

**Usage Notes**:

- Decreases amount in `fromVaultId` and increases amount in `toVaultId`.
- Updates both `Vault` and `PhysicalVaultReserve` structs.
- Emits `MoveSupply` event.

---

### **3. Admin Functions**

#### **addAdmin**

```solidity
function addAdmin(address _admin) external onlyOwner
```

**Purpose**: Allows the owner to add a new admin.

**Parameters**:

- `_admin`: Address of the admin to be added.

**Usage Notes**:

- Adds the address to the `admins` mapping.
- Emits `AdminAdded` event.

---

#### **removeAdmin**

```solidity
function removeAdmin(address _admin) external onlyOwner
```

**Purpose**: Allows the owner to remove an existing admin.

**Parameters**:

- `_admin`: Address of the admin to be removed.

**Usage Notes**:

- Removes the address from the `admins` mapping.
- Emits `AdminRemoved` event.

---

#### **addVault**

```solidity
function addVault(string memory _name) public onlyAdmin
```

**Purpose**: Adds a new vault to the system.

**Parameters**:

- `_name`: Name of the new vault.

**Usage Notes**:

- Creates a new `Vault` and `PhysicalVaultReserve` with `amount` set to `0`.
- Increments `nextVaultId`.
- Emits `VaultCreated` event.

---

#### **addMinter**

```solidity
function addMinter(address minter) public onlyAdmin
```

**Purpose**: Adds a new minter.

**Parameters**:

- `minter`: Address of the minter to be added.

**Usage Notes**:

- Adds the address to the `minters` mapping.
- Emits `MinterAdded` event.

---

#### **removeMinter**

```solidity
function removeMinter(address minter) public onlyAdmin
```

**Purpose**: Removes an existing minter.

**Parameters**:

- `minter`: Address of the minter to be removed.

**Usage Notes**:

- Removes the address from the `minters` mapping.
- Emits `MinterRemoved` event.

---

#### **setMintingAllowance**

```solidity
function setMintingAllowance(
    address minter,
    uint256 reserveId,
    uint256 allowance
) external onlyAdmin
```

**Purpose**: Sets the minting allowance for a minter on a specific reserve.

**Parameters**:

- `minter`: Address of the minter.
- `reserveId`: ID of the reserve.
- `allowance`: Amount of GIFT tokens the minter is allowed to mint.

**Usage Notes**:

- Adds `reserveId` to `minterReserves` if not already present.
- Updates `mintAllowances`.
- Emits `SetMintAllowance` event.

---

#### **_authorizeUpgrade**

```solidity
function _authorizeUpgrade(address newImplementation)
    internal
    override
    onlyAdmin
{}
```

**Purpose**: Internal function required for UUPS upgradeability pattern.

**Usage Notes**:

- Ensures only admins can authorize contract upgrades.

---

### **4. Minter Functions**

#### **updateReserveAfterMint**

```solidity
function updateReserveAfterMint(uint256 _vaultId, uint256 _amount)
    external
    onlyMinter
```

**Purpose**: Updates the reserve balance after minting tokens.

**Parameters**:

- `_vaultId`: ID of the vault.
- `_amount`: Amount of tokens minted.

**Usage Notes**:

- Decreases the `Vault` amount by `_amount`.
- Emits `VaultUpdatedAfterMint` event.

---

### **5. Vault Management Functions**

#### **getReserveState**

```solidity
function getReserveState(uint256 _vaultId)
    public
    view
    returns (
        string memory reserveName,
        uint256 reserveId,
        uint256 balance
    )
```

**Purpose**: Retrieves the state of a specific vault.

**Parameters**:

- `_vaultId`: ID of the vault.

**Returns**:

- `reserveName`: Name of the vault.
- `reserveId`: ID of the vault.
- `balance`: Current amount in the vault.

**Usage Notes**:

- Requires a valid `_vaultId`.

---

#### **getTotalReserves**

```solidity
function getTotalReserves()
    public
    view
    returns (uint256 totalReserves, uint256 totalAmount)
```

**Purpose**: Retrieves the total number of vaults and the total GIFT reserve amount.

**Returns**:

- `totalReserves`: Total number of vaults.
- `totalAmount`: Total GIFT reserve amount.

---

#### **retrieveReserve**

```solidity
function retrieveReserve() public view returns (uint256)
```

**Purpose**: Retrieves the total GIFT reserve amount.

**Returns**:

- Total GIFT reserve amount (`GIFT_reserve`).

---

### **6. Supply Management Functions**

Refer to Auditor Functions: **SupplyGold**, **RedeemGold**, **moveSupply**

---

### **7. Utility Functions**

#### **getMinterReservesAndAllowances**

```solidity
function getMinterReservesAndAllowances(address minter)
    public
    view
    returns (ReserveAllowance[] memory)
```

**Purpose**: Retrieves the list of reserves and allowances for a specific minter.

**Parameters**:

- `minter`: Address of the minter.

**Returns**:

- An array of `ReserveAllowance` structs.

---

#### **isMinter**

```solidity
function isMinter(address account) public view returns (bool)
```

**Purpose**: Checks if an address is a registered minter.

**Parameters**:

- `account`: Address to check.

**Returns**:

- `true` if the account is a minter, `false` otherwise.

---

---

## **Usage Guide**

### **Step-by-Step Workflow**

**1. Contract Initialization**

- **Owner** deploys the contract.
- Calls `initialize()` to set up initial roles (owner, auditor, admin, minter).

**2. Adding Roles**

- **Owner** can add auditors and admins using `addAuditor` and `addAdmin`.
- **Admins** can add minters using `addMinter`.

**3. Vault Management**

- **Admin** calls `addVault` to create new vaults.
- **Auditor** verifies physical reserves and updates vaults using `updateVault`.

**4. Managing Physical Reserves**

- **Auditor** adds physical supply using `SupplyGold`.
- **Auditor** removes physical supply using `RedeemGold`.

**5. Minting Process**

- **Admin** sets minting allowances for minters using `setMintingAllowance`.
- **Minter** mints tokens and updates reserves using `updateReserveAfterMint`.

**6. Transferring Supplies**

- **Auditor** moves supply between vaults using `moveSupply`.

**7. Retrieving Information**

- Anyone can retrieve vault and reserve information using `getReserveState`, `getTotalReserves`, and `retrieveReserve`.

---

### **Parameter Specifications**

#### **addAuditor / removeAuditor**

- **_auditor**: Address to be added or removed as an auditor.

#### **addAdmin / removeAdmin**

- **_admin**: Address to be added or removed as an admin.

#### **addMinter / removeMinter**

- **minter**: Address to be added or removed as a minter.

#### **addVault**

- **_name**: Name of the new vault.

#### **updateVault**

- **_vaultId**: ID of the vault to update.
- **_amountAdded**: Amount to add to the vault.
- **comment**: Explanation for the update.

#### **SupplyGold / RedeemGold**

- **vaultId**: ID of the vault.
- **amount**: Physical amount to add or remove.
- **comment**: Explanation for the action.

#### **moveSupply**

- **fromVaultId**: ID of the source vault.
- **toVaultId**: ID of the destination vault.
- **amount**: Amount to transfer.
- **comment**: Explanation for the transfer.

#### **setMintingAllowance**

- **minter**: Address of the minter.
- **reserveId**: ID of the reserve.
- **allowance**: Minting allowance amount.

#### **updateReserveAfterMint**

- **_vaultId**: ID of the vault.
- **_amount**: Amount of tokens minted.

---

### **Examples**

#### **Adding a New Vault**

```solidity
// Admin adds a new vault named "Main Vault"
giftPoR.addVault("Main Vault");
```

#### **Updating a Vault After Verifying Physical Reserves**

```solidity
// Auditor updates vault with ID 1, adding 1000 GIFT tokens
giftPoR.updateVault(1, 1000, "Added after physical verification of gold.");
```

#### **Adding Physical Supply to a Vault**

```solidity
// Auditor adds 500 grams of gold to the physical reserve of vault ID 1
giftPoR.SupplyGold(1, 500, "New gold deposit from supplier.");
```

#### **Setting Minting Allowance for a Minter**

```solidity
// Admin sets a minting allowance of 1000 GIFT tokens for minterAddress on reserve ID 1
giftPoR.setMintingAllowance(minterAddress, 1, 1000);
```

#### **Minter Updating Reserve After Minting**

```solidity
// Minter updates reserve after minting 200 GIFT tokens from vault ID 1
giftPoR.updateReserveAfterMint(1, 200);
```

---

## **Additional Notes**

### **Security Measures**

- **Access Control**: Strict role-based access control using modifiers (`onlyOwner`, `onlyAdmin`, `onlyAuditor`, `onlyMinter`).
- **Upgradeable Contract**: Uses OpenZeppelin's UUPSUpgradeable pattern for secure contract upgrades.
- **Event Logging**: Comprehensive event logging for transparency and auditability.
- **Input Validation**: Checks for valid vault IDs and sufficient balances before performing actions.

### **Important Considerations**

- **Decimals**: Ensure consistency in units when adding amounts (e.g., GIFT tokens vs. physical gold grams).
- **Role Management**: Only the owner can add or remove auditors and admins; admins manage minters.
- **Vault IDs**: Vault IDs start from 1 and increment with each new vault.
- **Minting Process**: Minters must have allowances set by admins and can only mint up to their allowance.
- **Reserve Integrity**: Total GIFT reserve (`GIFT_reserve`) should always reflect the sum of reserves in all vaults.

---

## **Conclusion**

The `GIFTPoR` smart contract is a robust solution for managing GIFT token reserves, ensuring transparency, and maintaining trust within the ecosystem. By leveraging role-based permissions and comprehensive functions for managing reserves and vaults, it provides a secure and efficient way to handle token minting and reserve verification processes. Users interacting with the contract should adhere to the guidelines provided to maintain the integrity and security of the system.

---

# **Appendix**

## **Common Questions**

**1. How do I add a new vault to the system?**

- An admin can call `addVault("Vault Name")` to create a new vault.

**2. Who can update vault reserves?**

- Only auditors can update vault reserves using functions like `updateVault`, `SupplyGold`, and `RedeemGold`.

**3. How are minting allowances managed?**

- Admins set minting allowances for minters on specific reserves using `setMintingAllowance`.

**4. Can a minter mint tokens without an allowance?**

- No, minters must have a positive allowance set by an admin to mint tokens.

**5. How is the total GIFT reserve calculated?**

- The total GIFT reserve (`GIFT_reserve`) is the sum of all reserves across all vaults.

---

## **Contact Information**

For support or inquiries, please contact:

- **Email**: [kassy@utribe.one](mailto:kassy@utribe.one)
- **Website**: [www.utribe.one](http://www.utribe.one)

---

# **Version History**

- **v1.0**: Initial release of the GIFTPoR contract documentation.

---
