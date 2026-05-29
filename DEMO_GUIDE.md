# IRMS Demo Guide
**Intelligent Retail Management System**

---

## 1. Starting the Application

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open: http://localhost:5173

---

## 2. Seed Commands

Run these from the `backend/` folder.

```bash
# Seed 12 products (Electronics, Clothing, Sports) with backdated catalog dates
node scripts/seedProducts.js

# Seed 5 demo campaigns with realistic usage counts
node scripts/seedCampaigns.js

# Full demo reset — wipe everything and start clean
node scripts/resetDemo.js
```

### What each seed does

| Command | What it does |
|---|---|
| `seedProducts.js` | Creates 12 products across 3 categories with dates ranging 8–100 days old. Clears existing Electronics/Clothing/Sports first. |
| `seedCampaigns.js` | Creates 5 admin campaigns (Spring Clearance, Electronics Flash, Sports Weekend, Welcome, Clothing Blowout) with pre-populated usage counts so they look live. Clears existing campaigns first. |
| `resetDemo.js` | Wipes ALL orders, ALL coupons (personal + campaigns), resets product prices back to basePrice, then re-seeds products and campaigns. Use this before every demo. |

---

## 3. How the Pricing Engine Works

### The Algorithm

Every product gets an **Urgency Score** from 0 to 1:

```
ageFactor   = min(daysInStore / 90, 1)     ← how old is it?
stockFactor = min(stockUnits / 200, 1)     ← how much is left?
urgencyScore = (0.7 × ageFactor) + (0.3 × stockFactor)
```

Age drives 70% of urgency. Stock drives 30%.

Then the markdown is calculated:

```
markdown% = urgencyScore × 40 × categoryMultiplier
newPrice  = basePrice × (1 - markdown% / 100)
price floor = never below 50% of basePrice
```

### Category Multipliers

| Category | Multiplier | Why |
|---|---|---|
| Food | 2.0 | Expires fast |
| Electronics | 1.5 | High value, slow turnover |
| Clothing | 1.2 | Seasonal |
| Sports | 1.0 | Baseline |
| Home | 0.8 | Durable goods |

### Example

Sony WH-1000XM5: basePrice $349.99, 95 days old, 180 units stock, Electronics

```
ageFactor   = min(95/90, 1) = 1.0
stockFactor = min(180/200, 1) = 0.9
urgencyScore = (0.7 × 1.0) + (0.3 × 0.9) = 0.97
markdown%   = 0.97 × 40 × 1.5 = 58.2% → capped at 50%
newPrice    = $349.99 × 0.50 = $175.00
```

### When does it run?

- **Automatically**: Every night at midnight (cron job)
- **Manually**: Admin → Pricing Monitor → "Run Engine Now"

---

## 4. How the Coupon System Works

### Types of Coupons

| Type | Code Format | Who Gets It | When | Details |
|---|---|---|---|---|
| **Thank You** | `THX·SWIFT·FALCON·4K2` | Personal (1 customer) | After every order | 10% off, 30 days, single use |
| **Loyalty** | `LYL·BOLD·STORM·9F3` | Personal | 3rd, 5th, 10th order | 20/25/30% off, 60 days |
| **Clearance** | `CLR·GOLD·EMBER·ZX3` | Global (all customers) | When any product stock < 20 after an order | 15% off that category, 7 days, 100 uses |
| **Campaign** | `SALE·WISE·DRIFT·5S9` | Global (all customers) | Admin creates manually | Custom %, category, duration, usage limit |

### Where Coupons Appear

| Coupon Type | Customer Wallet | Shop Banner | Checkout Recommendation |
|---|---|---|---|
| Thank You | Yes | No | Yes |
| Loyalty | Yes | No | Yes |
| Clearance | Yes | No | Yes |
| Campaign | **No** (use the code from the banner) | Yes | Yes (if validated manually) |

Campaign codes are **public** — they show in the banner on the Shop page. Customers copy the code and enter it at checkout. They do not appear in the personal wallet.

### How Checkout Coupons Work

1. Customer goes to `/checkout`
2. Click **"Find Best Coupon"** — scans all eligible personal coupons + clearance coupons and returns the one with the highest savings
3. Or type a campaign code manually in the code field → click Apply
4. Savings shown in real time before placing the order
5. After order → success screen shows newly generated coupons

### Nudge Messages

If a coupon's minimum cart value isn't met, "Find Best Coupon" shows:
> "Add $12.50 more to unlock 20% off (LYL·BOLD·STORM·9F3)"

---

## 5. How the Admin Campaign Builder Works

Go to: Admin → **Coupons**

### Creating a Campaign

1. Click **New Campaign**
2. Fill in:
   - **Campaign Name**: e.g. "Weekend Flash Sale"
   - **Discount Type**: Percentage or Fixed amount
   - **Value**: e.g. 20 (for 20%)
   - **Min Cart Value**: minimum the customer must spend (0 = no minimum)
   - **Category**: restrict to one category, or leave blank for all
   - **Duration**: how many days the campaign runs
   - **Usage Limit**: max number of redemptions
3. Click **Launch Campaign** → a `SALE·WORD·WORD·XXX` code is auto-generated
4. The code immediately appears in the **Shop page banner** for all customers

### Managing Campaigns

- **Pause**: temporarily hides it from the banner, code stops working at checkout
- **Resume**: reactivates it
- **Delete**: removes permanently
- Usage bar shows how many redemptions remain

---

## 6. How the Analytics Dashboard Works

Go to: Admin → **Analytics**

### KPI Cards

| Metric | What it means |
|---|---|
| Total Orders | Orders placed in the selected period (7/30/90 days) |
| Total Revenue | Sum of all order totals (after coupon deductions) |
| Avg Order Value | Total revenue ÷ number of orders |
| Coupons Issued | All coupons ever created (all time) |
| Redemption Rate | % of issued coupons that were used at least once |
| Avg Discount / Order | Total coupon savings ÷ number of orders |

### Orders Over Time Chart

- CSS bar chart — each bar = one day
- Height = number of orders that day relative to the busiest day
- Hover shows exact count and revenue

### Top Products by Revenue

- Ranks all products ever sold by total revenue generated
- Shows units sold alongside revenue

### Coupon Performance by Type

- Shows issued vs redeemed count for: Purchase (THX), Loyalty (LYL), Campaign (SALE)
- Progress bar shows redemption rate
- 100% means every issued coupon was used

### Inventory Health (bottom)

- Links to Pricing Monitor
- Shows: total products, at-risk count (urgency ≥ 40, not yet discounted), currently discounted

---

## 7. How the AI Features Work

### AI Pricing Insights (Admin → Pricing Monitor)

Click the purple **"AI Insights"** button. The system:
1. Pulls all 12 products with their live urgency scores
2. Sends the data to Groq (Llama 3.1) with a structured prompt
3. Returns a 3-panel card:
   - **Needs Immediate Action**: products with urgency ≥ 70, specific fix for each
   - **Category Health**: red/amber/green status per category with a one-line insight
   - **AI Recommendations**: 2 numbered, specific, actionable steps

The card header turns red (critical), amber (warning), or green (good) based on overall inventory health.

### AI Shopping Assistant (Customer → Shop page)

Purple chat bubble in the bottom-right corner. The AI knows:
- All products + current prices + discount status
- Customer's current cart
- Customer's available coupons in their wallet
- How many past orders the customer has placed

Example questions to demo:
- *"What's the best deal right now?"*
- *"I want something for working out under $100"*
- *"I have a clearance coupon — what can I use it on?"*
- *"What's on sale in Electronics?"*

---

## 8. Full Demo Reset (Start Fresh)

Run this before every demo:

```bash
cd backend && node scripts/resetDemo.js
```

This does in order:
1. Deletes all Orders
2. Deletes all Coupons (personal + campaigns)
3. Resets all product `currentPrice` back to `basePrice` and clears `priceHistory`
4. Re-seeds 12 products with fresh backdated dates
5. Re-seeds 5 campaigns

After reset:
- No orders exist
- No personal coupons exist
- 5 campaigns are live (visible in banner)
- All product prices are at full base price
- Running the pricing engine will drop prices again dramatically

---

## 9. Recommended Demo Flow (10 minutes)

### Part 1 — Admin Side (3 min)

1. Login as **Admin**
2. **Products** → show the 12 products, age badges (red = old), discount badges
3. **Pricing Monitor** → show urgency scores — everything is at full price after reset
4. Click **"Run Engine Now"** → watch discounts appear (Sony goes -50%, Nike goes -48%)
5. Click **"AI Insights"** → show the 3-panel analysis card
6. **Coupons** → show 5 live campaigns, usage bars, pause/resume one
7. **Analytics** → initially sparse — come back here after customer demo

### Part 2 — Customer Side (5 min)

1. Login as **Customer** (different browser tab or incognito)
2. **Shop** → banner shows active campaign code at top
3. Browse → show -X% OFF badges on discounted products
4. Click a product → show Price Journey timeline (listed → adjusted → current)
5. Open AI chat → ask *"What's the best deal right now?"*
6. Add 2 items to cart → navbar badge updates
7. **Cart** → adjust quantity, see line totals update
8. **Checkout** → click "Find Best Coupon" (nothing yet — first order)
9. Type the campaign code from the banner → it applies
10. Place Order → success screen shows **THX·WORD·WORD·XXX** coupon generated
11. **My Wallet** → show the Thank You coupon with countdown timer
12. Place a 2nd order → at checkout "Find Best Coupon" now finds the THX coupon automatically

### Part 3 — Back to Admin (2 min)

1. Switch back to Admin → **Analytics**
2. Revenue shows up, top products ranked, coupon performance updated
3. **Pricing Monitor → Activity Log** → shows price change history with timestamps

---

## 10. Account Setup

Register accounts manually at `/register`:

| Role | Tab to select | Suggested email |
|---|---|---|
| Admin | Store Admin | admin@irms.com |
| Customer | Customer | customer@irms.com |

Both accounts persist across resets. Only orders/coupons/prices are reset by `resetDemo.js`.
