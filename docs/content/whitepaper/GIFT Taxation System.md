# GIFT taxation system

* A tier-based outbound transfer tax is embedded in the smart contract.

* The fee is taken only from the sender's balance; receivers never pay a fee.

* Funds collected are routed automatically to the designated beneficiary wallet set in `GIFTTaxManager`, reducing net circulating supply.

* Exact tax bands (percent of the gross transfer amount)

* 1.618 %   for transfers ≤ 2 000 GIFT

* 1.20 %   for 2 000 < amount ≤ 10 000 GIFT

* 1.00 %   for 10 000 < amount ≤ 20 000 GIFT

* 0.50 %   for 20 000 < amount ≤ 200 000 GIFT

* 0.30 %   for amounts > 200 000 GIFT

* Exemptions

* Owner, tax-officer, and any address flagged exempt via `setFeeExclusion`.

* Liquidity-pool contracts marked with `setLiquidityPool`.

* All inbound transfers are globally exempt (`isExcludedFromInboundFees` always returns true).

* Effect

* Every qualifying outbound transaction burns value from circulation by redirecting the above percentages to the beneficiary wallet, providing a continuous, predictable deflationary pressure on the token supply.