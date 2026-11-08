# Receipt reader score

30 labelled receipts from [`tests/fixtures/receipts.mts`](../tests/fixtures/receipts.mts). AI not measured: no `AI_API_KEY` was set.

| Measure | Rules |
| --- | --- |
| Receipts fully right | 40% |
| Store | 97% |
| Purchase date | 93% |
| Order number | 83% |
| Items found that are real (precision) | 83% |
| Real items found (recall) | 69% |
| Item F1 | 0.75 |
| SKU right, of items found | 100% |
| Median time per receipt | 0 ms |

## Receipt by receipt

| Receipt | What it tests | Rules |
| --- | --- | :---: |
| `target-store-clean` | Clean Target store receipt | ❌ |
| `target-email` | Target.com order confirmation email | ❌ |
| `target-multibuy` | Quantity line: price must be per unit | ❌ |
| `target-split-lines` | OCR put item names and prices on separate lines | ❌ |
| `target-loyalty-date-first` | An old 'member since' date comes before the purchase date | ❌ |
| `bestbuy-store` | Best Buy store receipt with SKU on the line | ✅ |
| `bestbuy-email` | BestBuy.com email with SKU on its own line | ❌ |
| `bestbuy-protection` | Protection plan is a real purchase; recycling fee is not an item | ❌ |
| `bestbuy-garbled-name` | OCR garbled the store name; the yellow-tag slogan is still there | ❌ |
| `bestbuy-openbox` | Open-box price with a separate discount line | ✅ |
| `homedepot-store` | Home Depot store receipt with UPC and tax flag | ✅ |
| `homedepot-email` | homedepot.com order with Internet number | ❌ |
| `homedepot-multibuy` | Quantity written as 4@3.48 | ❌ |
| `costco-warehouse` | Costco warehouse receipt with E flags and item numbers | ✅ |
| `costco-instant-savings` | Instant savings line under the item | ❌ |
| `costco-online` | Costco.com order email | ❌ |
| `costco-member-lines` | Membership number and executive rewards lines | ✅ |
| `walmart` | Store we don't support: store should be empty | ✅ |
| `amazon-email` | Amazon email: unsupported store, order id with dashes | ❌ |
| `iso-date` | Date written as 2026-10-30 | ✅ |
| `dotted-date` | Date written with dots: 10.29.26 | ❌ |
| `return-by-date-first` | A future 'return by' date appears before the purchase date | ✅ |
| `dollar-as-s` | OCR read $ as S | ✅ |
| `wrapped-name` | A long item name wrapped onto a second line | ❌ |
| `tax-and-bag-fee` | Bag fee and tax lines must not become items | ❌ |
| `no-items` | Gift card balance slip with no products | ✅ |
| `not-a-receipt` | A photo of something that isn't a receipt | ✅ |
| `costco-gas` | Costco gas station receipt: fuel is an item | ❌ |
| `homedepot-pro-xtra` | Pro Xtra savings lines and a negative price | ✅ |
| `target-month-name` | Month written out with no comma: Nov 3 2026 | ❌ |

Generated 2026-11-08 by `npm run eval`.
