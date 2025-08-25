

## Updated PriceManager Contract

```solidity

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title PriceManager
 * @dev Manages token prices, with automatic GIFT price calculation from Chainlink XAU/USD feed
 * 1 GIFT token = 1 milligram of gold
 */
contract PriceManager is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    // Role identifiers
    bytes32 public constant PRICE_SETTER_ROLE = keccak256("PRICE_SETTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // Mapping to store token price feeds
    mapping(address => AggregatorV3Interface) public tokenPriceFeeds;

    // Chainlink XAU/USD price feed
    AggregatorV3Interface public xauUsdPriceFeed;

    // GIFT price override in USD (18 decimals)
    uint256 public manualGiftPrice;

    // Toggle for using manual price vs. Chainlink
    bool public useManualPrice;

    // Constants for conversion
    uint256 public constant MG_PER_TROY_OUNCE = 31_103; // 31,103.5 mg with 3 decimal places

    // Events
    event ManualGiftPriceUpdated(
        uint256 oldPrice,
        uint256 newPrice,
        uint256 timestamp
    );
    event PriceFeedUpdated(address token, address feed);
    event XauUsdPriceFeedUpdated(address oldFeed, address newFeed);
    event PriceSetterAdded(address account);
    event PriceSetterRemoved(address account);
    event PriceSourceToggled(bool useManualPrice);

    /**
     * @dev Initialize the PriceManager contract
     * @param _xauUsdPriceFeed The Chainlink XAU/USD price feed address
     */
    function initialize(address _xauUsdPriceFeed) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PRICE_SETTER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

        // Set initial manual GIFT price (e.g., $0.10 with 18 decimals)
        manualGiftPrice = 100000000000000000;

        // Set XAU/USD price feed
        require(
            _xauUsdPriceFeed != address(0),
            "Price feed cannot be zero address"
        );
        xauUsdPriceFeed = AggregatorV3Interface(_xauUsdPriceFeed);

        // Default to using Chainlink price
        useManualPrice = false;
    }

    /**
     * @dev Get the GIFT token price in USD (1 GIFT = 1 mg of gold)
     * @return price The USD price of 1 GIFT token with 18 decimals
     */
    function viewGiftPrice() public view returns (uint256) {
        if (useManualPrice) {
            return manualGiftPrice;
        } else {
            return getChainlinkGiftPrice();
        }
    }

    /**
     * @dev Calculate the GIFT price using Chainlink XAU/USD feed
     * @return price The USD price of 1 GIFT token with 18 decimals
     */
    function getChainlinkGiftPrice() public view returns (uint256) {
        // Get the latest XAU/USD price (price of 1 troy ounce of gold in USD)
        (, int256 chainlinkPrice, , , ) = xauUsdPriceFeed.latestRoundData();
        require(chainlinkPrice > 0, "Invalid price from Chainlink");

        // Chainlink XAU/USD feed has 8 decimals
        uint256 pricePerOunce = uint256(chainlinkPrice);

        // Convert from troy ounce to milligram and adjust decimals
        // Convert from 8 decimals to 18 decimals: multiply by 10^10
        // 1 troy oz = 31,103.5 milligrams
        return (pricePerOunce * 1e10) / MG_PER_TROY_OUNCE;
    }

    /**
     * @dev Get the latest token price from a Chainlink price feed
     * @param _token The token address
     * @return The latest price
     */
    function getLatestTokenPrice(address _token)
        external
        view
        returns (int256)
    {
        AggregatorV3Interface priceFeed = tokenPriceFeeds[_token];
        require(address(priceFeed) != address(0), "Price feed not set");
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }

    /**
     * @dev Update the XAU/USD price feed address
     * @param _newFeedAddress The new price feed address
     */
    function updateXauUsdPriceFeed(address _newFeedAddress)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(_newFeedAddress != address(0), "Feed cannot be zero address");
        address oldFeed = address(xauUsdPriceFeed);
        xauUsdPriceFeed = AggregatorV3Interface(_newFeedAddress);
        emit XauUsdPriceFeedUpdated(oldFeed, _newFeedAddress);
    }

    /**
     * @dev Update a token's price feed
     * @param _token The token address
     * @param _feedAddress The price feed address
     */
    function updatePriceFeed(address _token, address _feedAddress)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(_token != address(0), "Token cannot be zero address");
        require(_feedAddress != address(0), "Feed cannot be zero address");
        tokenPriceFeeds[_token] = AggregatorV3Interface(_feedAddress);
        emit PriceFeedUpdated(_token, _feedAddress);
    }

    /**
     * @dev Set the manual GIFT price
     * @param _price The new GIFT price (18 decimals)
     */
    function setManualGiftPrice(uint256 _price)
        external
        onlyRole(PRICE_SETTER_ROLE)
    {
        uint256 oldPrice = manualGiftPrice;
        manualGiftPrice = _price;
        emit ManualGiftPriceUpdated(oldPrice, _price, block.timestamp);
    }

    /**
     * @dev Toggle between manual price and Chainlink price
     * @param _useManualPrice Whether to use the manual price
     */
    function togglePriceSource(bool _useManualPrice)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        useManualPrice = _useManualPrice;
        emit PriceSourceToggled(_useManualPrice);
    }

    /**
     * @dev Grant the price setter role to an account
     * @param _account The account to grant the role to
     */
    function grantPriceSetterRole(address _account)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        grantRole(PRICE_SETTER_ROLE, _account);
        emit PriceSetterAdded(_account);
    }

    /**
     * @dev Revoke the price setter role from an account
     * @param _account The account to revoke the role from
     */
    function revokePriceSetterRole(address _account)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        revokeRole(PRICE_SETTER_ROLE, _account);
        emit PriceSetterRemoved(_account);
    }

    /**
     * @dev Transfer admin role to a new account
     * @param _newAdmin The address of the new admin
     */
    function transferAdminRole(address _newAdmin)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(_newAdmin != address(0), "New admin cannot be zero address");

        // Grant the role to the new admin
        _grantRole(DEFAULT_ADMIN_ROLE, _newAdmin);

        // Revoke the role from the current admin (msg.sender)
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);

        emit RoleGranted(DEFAULT_ADMIN_ROLE, _newAdmin, msg.sender);
        emit RoleRevoked(DEFAULT_ADMIN_ROLE, msg.sender, msg.sender);
    }

    /**
     * @dev Function that authorizes an upgrade to a new implementation
     * @param newImplementation The address of the new implementation
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}
```

## Contract Addresses 
> Polygon Mainet

Implementation: 0x17C5847fCf60D207a0D54cB741008afA522de338

Proxy: 0xda02cF7fB16CAA375D845fbDcED39Fc5B08f1F22

## Integration Guide

### For Smart Contracts

To integrate with other smart contracts:

```solidity
// Interface for the PriceManager
interface IPriceManager {
    function viewGiftPrice() external view returns (uint256);
}

contract YourContract {
    IPriceManager public priceManager;
    
    constructor(address _priceManagerAddress) {
        priceManager = IPriceManager(_priceManagerAddress);
    }
    
    function getGiftValueInUsd(uint256 giftAmount) public view returns (uint256) {
        // Get GIFT price (18 decimals)
        uint256 pricePerGift = priceManager.viewGiftPrice();
        
        // Calculate value (maintain 18 decimals)
        return (giftAmount * pricePerGift) / 1e18;
    }
}
```

### For Frontend Applications

```javascript
// Using ethers.js
async function getGiftPrice(priceManagerAddress) {
    // Create a contract instance
    const abi = ["function viewGiftPrice() view returns (uint256)"];
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const priceManager = new ethers.Contract(priceManagerAddress, abi, provider);
    
    // Call the viewGiftPrice function
    const priceInWei = await priceManager.viewGiftPrice();
    
    // Convert to a human-readable format (18 decimals)
    const priceInUsd = ethers.utils.formatUnits(priceInWei, 18);
    return priceInUsd;
}
```

## How It Works

1. **Price Sourcing**: The contract fetches the current XAU/USD price from Chainlink, which provides the price of one troy ounce of gold in USD with 8 decimal precision.

2. **Conversion to Milligram**: Since 1 GIFT = 1 milligram of gold and the Chainlink feed gives price per troy ounce, the contract:
   - Takes the price per troy ounce (8 decimals)
   - Converts from 8 to 18 decimals by multiplying by 10^10
   - Divides by 31,103.5 milligrams per troy ounce (using 31,103 to maintain 3 decimal precision)

3. **Fallback Mechanism**: The contract includes a manual price option that can be activated in case of Chainlink outages or issues.

4. **Access Control**: Different roles manage different aspects of the contract:
   - DEFAULT_ADMIN_ROLE: Can add/remove other roles and update price feed addresses
   - PRICE_SETTER_ROLE: Can update the manual price
   - UPGRADER_ROLE: Can authorize contract upgrades

## Additional Notes

1. **Gas Optimization**: The `viewGiftPrice` function is a `view` function, meaning it doesn't cost gas unless called from another contract's state-changing function.

2. **Security**: The contract uses OpenZeppelin's battle-tested libraries and Chainlink's trusted price feeds.

3. **Upgradability**: The contract uses the UUPS upgradeable pattern, allowing for future upgrades if needed.

4. **Testing**: Before deploying to mainnet, test on testnets using the corresponding Chainlink testnet feed addresses.

The implemented contract allows for easy access to the GIFT token price both on-chain and off-chain, making it perfect for integrations with other contracts and applications.


For more help contact: kassy@utribe.one