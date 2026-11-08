// Labelled receipt texts for scoring the receipt readers (npm run eval).
// Each text imitates what OCR returns from a photo or an order email,
// including typical mess: tabs between columns, split lines, odd spacing.
// Everything here is made up.
//
// Labelling rules (the AI prompt follows the same ones):
// - storeId is "" when the store isn't one of the four we support.
// - price is the price of ONE unit as printed for the item, before any
//   separate discount line. For "2 @ $3.99", the price is 3.99.
// - sku is the item number printed with the item, or "".
// - Totals, taxes, payments, discounts and fees are not items.

export type Expected = {
  storeId: "target" | "bestbuy" | "homedepot" | "costco" | "";
  purchaseDate: string;
  orderNumber: string;
  items: { name: string; sku: string; price: number }[];
};

export type Fixture = { id: string; note: string; today: string; text: string; expected: Expected };

const TODAY = "2026-11-08";

export const FIXTURES: Fixture[] = [
  {
    id: "target-store-clean",
    note: "Clean Target store receipt",
    today: TODAY,
    text: `TARGET
Expect More. Pay Less.
Store T-1375  Minneapolis MN
11/02/2026 15:41
212-08-1234\tINSIGNIA 50IN 4K TV\tNF\t$279.99
057-12-0001\tBAND-AID 30CT\tT\t$4.49
SUBTOTAL\t$284.48
T = MN TAX 6.875%\t$0.31
TOTAL\t$284.79
VISA CHARGE\t$284.79
REC# 2-4471-0213-0099-2210-7`,
    expected: {
      storeId: "target",
      purchaseDate: "2026-11-02",
      orderNumber: "2-4471-0213-0099-2210-7",
      items: [
        { name: "INSIGNIA 50IN 4K TV", sku: "212-08-1234", price: 279.99 },
        { name: "BAND-AID 30CT", sku: "057-12-0001", price: 4.49 },
      ],
    },
  },
  {
    id: "target-email",
    note: "Target.com order confirmation email",
    today: TODAY,
    text: `Thanks for your order, Maya!
Order #912004417283
Placed Oct 30, 2026
Ninja 6qt Air Fryer - Gray
Qty: 1
$119.99
Threshold Cotton Bath Towel
Qty: 1
$12.00
Subtotal $131.99
Estimated tax $10.89
Total $142.88
target.com`,
    expected: {
      storeId: "target",
      purchaseDate: "2026-10-30",
      orderNumber: "912004417283",
      items: [
        { name: "Ninja 6qt Air Fryer - Gray", sku: "", price: 119.99 },
        { name: "Threshold Cotton Bath Towel", sku: "", price: 12.0 },
      ],
    },
  },
  {
    id: "target-multibuy",
    note: "Quantity line: price must be per unit",
    today: TODAY,
    text: `TARGET
10/27/2026 09:12
071-04-2234 DORITOS NACHO
2 @ $4.29\t$8.58
288-01-0045 UP&UP PAPER TOWEL 6PK\t$9.99
SUBTOTAL\t$18.57
TOTAL\t$19.85
REC# 2-1180-0044-0021-5512-9`,
    expected: {
      storeId: "target",
      purchaseDate: "2026-10-27",
      orderNumber: "2-1180-0044-0021-5512-9",
      items: [
        { name: "DORITOS NACHO", sku: "071-04-2234", price: 4.29 },
        { name: "UP&UP PAPER TOWEL 6PK", sku: "288-01-0045", price: 9.99 },
      ],
    },
  },
  {
    id: "target-split-lines",
    note: "OCR put item names and prices on separate lines",
    today: TODAY,
    text: `TARGET
Store 2210
11/05/2026
ELECTRONICS
APPLE AIRPODS 4
$129.00
HOME
ROOM ESSENTIALS DESK LAMP
$15.00
SUBTOTAL $144.00
TOTAL $155.88
DEBIT $155.88`,
    expected: {
      storeId: "target",
      purchaseDate: "2026-11-05",
      orderNumber: "",
      items: [
        { name: "APPLE AIRPODS 4", sku: "", price: 129.0 },
        { name: "ROOM ESSENTIALS DESK LAMP", sku: "", price: 15.0 },
      ],
    },
  },
  {
    id: "target-loyalty-date-first",
    note: "An old 'member since' date comes before the purchase date",
    today: TODAY,
    text: `Target Circle member since 03/14/2019
Store 0918
10/31/2026 18:02
247-03-1120\tHYDRO FLASK 32OZ\tT\t$44.95
SUBTOTAL\t$44.95
TOTAL\t$47.98
REC# 2-0918-1031-4410-2233-1`,
    expected: {
      storeId: "target",
      purchaseDate: "2026-10-31",
      orderNumber: "2-0918-1031-4410-2233-1",
      items: [{ name: "HYDRO FLASK 32OZ", sku: "247-03-1120", price: 44.95 }],
    },
  },
  {
    id: "bestbuy-store",
    note: "Best Buy store receipt with SKU on the line",
    today: TODAY,
    text: `BEST BUY #0451
Richfield, MN
Date: 10/29/2026  Time: 14:05
Trans: 0451-003-2291
6578123\tSAMSUNG 65IN QLED TV\t$549.99
6412590\tHDMI CABLE 6FT\t$19.99
Subtotal\t$569.98
Sales Tax\t$39.18
Total\t$609.16
Mastercard\t$609.16`,
    expected: {
      storeId: "bestbuy",
      purchaseDate: "2026-10-29",
      orderNumber: "0451-003-2291",
      items: [
        { name: "SAMSUNG 65IN QLED TV", sku: "6578123", price: 549.99 },
        { name: "HDMI CABLE 6FT", sku: "6412590", price: 19.99 },
      ],
    },
  },
  {
    id: "bestbuy-email",
    note: "BestBuy.com email with SKU on its own line",
    today: TODAY,
    text: `Your order has been placed
Order Number: BBY01-806512349987
Order Date: Nov 1, 2026
Sony WH-1000XM6 Wireless Noise Canceling Headphones
SKU: 6577432
Qty: 1
$399.99
Item Subtotal: $399.99
Total: $431.99
bestbuy.com`,
    expected: {
      storeId: "bestbuy",
      purchaseDate: "2026-11-01",
      orderNumber: "BBY01-806512349987",
      items: [
        { name: "Sony WH-1000XM6 Wireless Noise Canceling Headphones", sku: "6577432", price: 399.99 },
      ],
    },
  },
  {
    id: "bestbuy-protection",
    note: "Protection plan is a real purchase; recycling fee is not an item",
    today: TODAY,
    text: `BEST BUY #1102
10/25/2026 11:30
6531122\tMACBOOK AIR 13 M5\t$999.00
4390012\tGEEK SQUAD PROTECTION 2YR\t$149.99
STATE RECYCLING FEE\t$5.00
SUBTOTAL\t$1153.99
TOTAL\t$1234.77
Trans: 1102-007-8810`,
    expected: {
      storeId: "bestbuy",
      purchaseDate: "2026-10-25",
      orderNumber: "1102-007-8810",
      items: [
        { name: "MACBOOK AIR 13 M5", sku: "6531122", price: 999.0 },
        { name: "GEEK SQUAD PROTECTION 2YR", sku: "4390012", price: 149.99 },
      ],
    },
  },
  {
    id: "bestbuy-garbled-name",
    note: "OCR garbled the store name; the yellow-tag slogan is still there",
    today: TODAY,
    text: `BES T 8UY #0287
Let's talk about what's possible.
11/04/2026 16:48
6455001\tNINTENDO SWITCH 2\t$449.99
SUBTOTAL\t$449.99
TOTAL\t$482.62
Trans: 0287-002-1190`,
    expected: {
      storeId: "bestbuy",
      purchaseDate: "2026-11-04",
      orderNumber: "0287-002-1190",
      items: [{ name: "NINTENDO SWITCH 2", sku: "6455001", price: 449.99 }],
    },
  },
  {
    id: "bestbuy-openbox",
    note: "Open-box price with a separate discount line",
    today: TODAY,
    text: `BEST BUY #0451
10/30/2026
6501987\tOPEN-BOX DYSON V12 VACUUM\t$499.99
OPEN BOX DISCOUNT\t-$75.00
SUBTOTAL\t$424.99
TOTAL\t$454.20
Trans: 0451-001-7733`,
    expected: {
      storeId: "bestbuy",
      purchaseDate: "2026-10-30",
      orderNumber: "0451-001-7733",
      items: [{ name: "OPEN-BOX DYSON V12 VACUUM", sku: "6501987", price: 499.99 }],
    },
  },
  {
    id: "homedepot-store",
    note: "Home Depot store receipt with UPC and tax flag",
    today: TODAY,
    text: `THE HOME DEPOT
1825 BLOOMINGTON  MN
10/21/2026  08:14 AM
885911618267  DEWALT 20V DRILL KIT  <A>  179.00
049793015117  GORILLA WOOD GLUE  <A>  6.98
SUBTOTAL  185.98
SALES TAX  12.79
TOTAL  $198.77
ORDER # H1825-112233`,
    expected: {
      storeId: "homedepot",
      purchaseDate: "2026-10-21",
      orderNumber: "H1825-112233",
      items: [
        { name: "DEWALT 20V DRILL KIT", sku: "885911618267", price: 179.0 },
        { name: "GORILLA WOOD GLUE", sku: "049793015117", price: 6.98 },
      ],
    },
  },
  {
    id: "homedepot-email",
    note: "homedepot.com order with Internet number",
    today: TODAY,
    text: `Order Confirmation
Order Number: WM12345678
Order Date: 10/24/2026
RYOBI ONE+ 18V Cordless Leaf Blower
Internet #312945871
Qty 1  $129.00
Subtotal $129.00
Order Total $138.03
The Home Depot`,
    expected: {
      storeId: "homedepot",
      purchaseDate: "2026-10-24",
      orderNumber: "WM12345678",
      items: [{ name: "RYOBI ONE+ 18V Cordless Leaf Blower", sku: "312945871", price: 129.0 }],
    },
  },
  {
    id: "homedepot-multibuy",
    note: "Quantity written as 4@3.48",
    today: TODAY,
    text: `HOME DEPOT #2801
11/01/2026
032076104016  BEHR PAINT SAMPLE
4@3.48  13.92
070798182509  2IN PAINTER'S TAPE  7.97
SUBTOTAL 21.89
TOTAL $23.42
ORDER # H2801-554410`,
    expected: {
      storeId: "homedepot",
      purchaseDate: "2026-11-01",
      orderNumber: "H2801-554410",
      items: [
        { name: "BEHR PAINT SAMPLE", sku: "032076104016", price: 3.48 },
        { name: "2IN PAINTER'S TAPE", sku: "070798182509", price: 7.97 },
      ],
    },
  },
  {
    id: "costco-warehouse",
    note: "Costco warehouse receipt with E flags and item numbers",
    today: TODAY,
    text: `COSTCO
WHOLESALE
Eden Prairie #1021
E 1655430 KS PAPER TOWEL 12CT 23.99 A
E 1207440 DYSON V8 VACUUM 299.99 A
E 512200 ORGANIC BANANAS 1.99 E
SUBTOTAL 325.97
TAX 22.41
**** TOTAL 348.38
11/03/2026 13:20 1021 07 112 455`,
    expected: {
      storeId: "costco",
      purchaseDate: "2026-11-03",
      orderNumber: "",
      items: [
        { name: "KS PAPER TOWEL 12CT", sku: "1655430", price: 23.99 },
        { name: "DYSON V8 VACUUM", sku: "1207440", price: 299.99 },
        { name: "ORGANIC BANANAS", sku: "512200", price: 1.99 },
      ],
    },
  },
  {
    id: "costco-instant-savings",
    note: "Instant savings line under the item",
    today: TODAY,
    text: `COSTCO WHOLESALE
Roseville #384
E 1594210 VITAMIX E310 349.99 A
/1594210 TPD/VITAMIX 50.00-
E 9870012 KIRKLAND OLIVE OIL 2L 24.99 E
SUBTOTAL 324.98
TOTAL 346.91
10/28/2026 17:05 384 11 201 8812`,
    expected: {
      storeId: "costco",
      purchaseDate: "2026-10-28",
      orderNumber: "",
      items: [
        { name: "VITAMIX E310", sku: "1594210", price: 349.99 },
        { name: "KIRKLAND OLIVE OIL 2L", sku: "9870012", price: 24.99 },
      ],
    },
  },
  {
    id: "costco-online",
    note: "Costco.com order email",
    today: TODAY,
    text: `Thank you for shopping at Costco.com
Order Number: 1188223344
Order Date: 10/26/2026
Samsung 85" Class Crystal UHD TV
Item 1789044
Quantity 1   $899.99
Merchandise Subtotal $899.99
Order Total $961.44`,
    expected: {
      storeId: "costco",
      purchaseDate: "2026-10-26",
      orderNumber: "1188223344",
      items: [{ name: 'Samsung 85" Class Crystal UHD TV', sku: "1789044", price: 899.99 }],
    },
  },
  {
    id: "costco-member-lines",
    note: "Membership number and executive rewards lines",
    today: TODAY,
    text: `COSTCO WHOLESALE
Burnsville #391
Member 111234567890
E 1401876 AIRPODS PRO 3 199.99 A
SUBTOTAL 199.99
TAX 13.75
TOTAL 213.74
EXECUTIVE MEMBER 2% REWARD 4.00
11/06/2026 10:41 391 03 088 2231`,
    expected: {
      storeId: "costco",
      purchaseDate: "2026-11-06",
      orderNumber: "",
      items: [{ name: "AIRPODS PRO 3", sku: "1401876", price: 199.99 }],
    },
  },
  {
    id: "walmart",
    note: "Store we don't support: store should be empty",
    today: TODAY,
    text: `Walmart
Save money. Live better.
ST# 01848 OP# 009044 TE# 44 TR# 01877
GREAT VALUE MILK 007874235187 F 3.48 N
ONN 32IN ROKU TV 068113109932 98.00 X
SUBTOTAL 101.48
TAX 1 6.875 % 6.74
TOTAL 108.22
11/02/26 19:22:10`,
    expected: {
      storeId: "",
      purchaseDate: "2026-11-02",
      orderNumber: "",
      items: [
        { name: "GREAT VALUE MILK", sku: "007874235187", price: 3.48 },
        { name: "ONN 32IN ROKU TV", sku: "068113109932", price: 98.0 },
      ],
    },
  },
  {
    id: "amazon-email",
    note: "Amazon email: unsupported store, order id with dashes",
    today: TODAY,
    text: `Ordered on October 29, 2026
Order # 113-4482910-5532211
Kindle Paperwhite (16 GB)
Sold by: Amazon.com Services LLC
$159.99
Item(s) Subtotal: $159.99
Grand Total: $171.19`,
    expected: {
      storeId: "",
      purchaseDate: "2026-10-29",
      orderNumber: "113-4482910-5532211",
      items: [{ name: "Kindle Paperwhite (16 GB)", sku: "", price: 159.99 }],
    },
  },
  {
    id: "iso-date",
    note: "Date written as 2026-10-30",
    today: TODAY,
    text: `TARGET
2026-10-30 12:01
233-09-4410 STANLEY QUENCHER 40OZ $45.00
SUBTOTAL $45.00
TOTAL $48.09`,
    expected: {
      storeId: "target",
      purchaseDate: "2026-10-30",
      orderNumber: "",
      items: [{ name: "STANLEY QUENCHER 40OZ", sku: "233-09-4410", price: 45.0 }],
    },
  },
  {
    id: "dotted-date",
    note: "Date written with dots: 10.29.26",
    today: TODAY,
    text: `BEST BUY #0451
10.29.26 13:40
6509911\tLOGITECH MX MASTER 4\t$119.99
TOTAL\t$128.24
Trans: 0451-004-1022`,
    expected: {
      storeId: "bestbuy",
      purchaseDate: "2026-10-29",
      orderNumber: "0451-004-1022",
      items: [{ name: "LOGITECH MX MASTER 4", sku: "6509911", price: 119.99 }],
    },
  },
  {
    id: "return-by-date-first",
    note: "A future 'return by' date appears before the purchase date",
    today: TODAY,
    text: `THE HOME DEPOT
Return by: 01/27/2027
Purchased: 10/29/2026
885911701124 DEWALT IMPACT DRIVER <A> 139.00
TOTAL $148.73
ORDER # H0412-998877`,
    expected: {
      storeId: "homedepot",
      purchaseDate: "2026-10-29",
      orderNumber: "H0412-998877",
      items: [{ name: "DEWALT IMPACT DRIVER", sku: "885911701124", price: 139.0 }],
    },
  },
  {
    id: "dollar-as-s",
    note: "OCR read $ as S",
    today: TODAY,
    text: `TARGET
11/01/2026
212-44-0981 KEURIG K-MINI S79.99
288-02-1180 GOOD&GATHER COFFEE S8.49
TOTAL S94.29`,
    expected: {
      storeId: "target",
      purchaseDate: "2026-11-01",
      orderNumber: "",
      items: [
        { name: "KEURIG K-MINI", sku: "212-44-0981", price: 79.99 },
        { name: "GOOD&GATHER COFFEE", sku: "288-02-1180", price: 8.49 },
      ],
    },
  },
  {
    id: "wrapped-name",
    note: "A long item name wrapped onto a second line",
    today: TODAY,
    text: `BEST BUY #0611
11/02/2026
6560044 BOSE QUIETCOMFORT ULTRA
EARBUDS 2ND GEN BLACK $279.00
TOTAL $299.11
Trans: 0611-002-5521`,
    expected: {
      storeId: "bestbuy",
      purchaseDate: "2026-11-02",
      orderNumber: "0611-002-5521",
      items: [{ name: "BOSE QUIETCOMFORT ULTRA EARBUDS 2ND GEN BLACK", sku: "6560044", price: 279.0 }],
    },
  },
  {
    id: "tax-and-bag-fee",
    note: "Bag fee and tax lines must not become items",
    today: TODAY,
    text: `TARGET
10/28/2026
212-31-7782 JBL FLIP 7 SPEAKER $99.99
BAG FEE $0.10
T = MN TAX 6.875% $6.88
TOTAL $106.97`,
    expected: {
      storeId: "target",
      purchaseDate: "2026-10-28",
      orderNumber: "",
      items: [{ name: "JBL FLIP 7 SPEAKER", sku: "212-31-7782", price: 99.99 }],
    },
  },
  {
    id: "no-items",
    note: "Gift card balance slip with no products",
    today: TODAY,
    text: `TARGET
GIFT CARD BALANCE INQUIRY
11/04/2026 10:10
CARD ************4410
BALANCE $25.00`,
    expected: { storeId: "target", purchaseDate: "2026-11-04", orderNumber: "", items: [] },
  },
  {
    id: "not-a-receipt",
    note: "A photo of something that isn't a receipt",
    today: TODAY,
    text: `MEETING NOTES
Q4 planning - Room 3B
Budget review 10:30
Call Priya re: vendor quote
Lunch $12 split`,
    expected: { storeId: "", purchaseDate: "", orderNumber: "", items: [] },
  },
  {
    id: "costco-gas",
    note: "Costco gas station receipt: fuel is an item",
    today: TODAY,
    text: `COSTCO GASOLINE
Eden Prairie #1021
11/05/2026 07:58
PUMP 07 REGULAR
11.204 GAL @ 2.899/GAL
FUEL TOTAL $32.48
VISA $32.48`,
    expected: {
      storeId: "costco",
      purchaseDate: "2026-11-05",
      orderNumber: "",
      items: [{ name: "REGULAR", sku: "", price: 32.48 }],
    },
  },
  {
    id: "homedepot-pro-xtra",
    note: "Pro Xtra savings lines and a negative price",
    today: TODAY,
    text: `THE HOME DEPOT #0412
11/03/2026
PRO XTRA MEMBER
195121044551  MILWAUKEE M18 BATTERY 2PK  <A>  199.00
PRO XTRA PAINT REWARD  -10.00
764666140221  HUSKY TOOL BAG  24.97
SUBTOTAL  213.97
TOTAL  $228.73
ORDER # H0412-221100`,
    expected: {
      storeId: "homedepot",
      purchaseDate: "2026-11-03",
      orderNumber: "H0412-221100",
      items: [
        { name: "MILWAUKEE M18 BATTERY 2PK", sku: "195121044551", price: 199.0 },
        { name: "HUSKY TOOL BAG", sku: "764666140221", price: 24.97 },
      ],
    },
  },
  {
    id: "target-month-name",
    note: "Month written out with no comma: Nov 3 2026",
    today: TODAY,
    text: `TARGET.COM ORDER
Order placed Nov 3 2026
Order #912008812201
LEGO Star Wars X-Wing 75355
$199.99
Order total $213.74`,
    expected: {
      storeId: "target",
      purchaseDate: "2026-11-03",
      orderNumber: "912008812201",
      items: [{ name: "LEGO Star Wars X-Wing 75355", sku: "", price: 199.99 }],
    },
  },
];
