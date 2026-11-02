// =====================================================================
// CONFIGURATION: put your organization's real details here.
// Any method left with a "REPLACE_" value is automatically disabled on
// the site, so visitors never see a placeholder address.
// =====================================================================
const CONFIG = {
  organization: "Hope Children's Home",
  bitcoinAddress: "bc1qtvdp5aq74hlunk9rlgw8zffvqgfve02893uphr", // e.g. bc1q...
  paypalHandle: "REPLACE_PAYPAL_HANDLE",      // your paypal.me name, e.g. "hopechildrenshome"
  cashAppTag: "REPLACE_CASHTAG",              // your $cashtag WITHOUT the $ sign
  currency: "USD",
  defaultAmount: 25,
};

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
const isConfigured = (value) => Boolean(value) && !value.startsWith("REPLACE_");

// Turns "25", "$25.5", "1,000" into a clean number, or null if invalid.
function cleanAmount(raw) {
  const n = parseFloat(String(raw ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: CONFIG.currency,
  }).format(amount);
}

function paypalUrl(amount) {
  const base = `https://paypal.me/${encodeURIComponent(CONFIG.paypalHandle)}`;
  return amount ? `${base}/${amount}${CONFIG.currency}` : base;
}

function cashAppUrl(amount) {
  const base = `https://cash.app/$${encodeURIComponent(CONFIG.cashAppTag)}`;
  return amount ? `${base}/${amount}` : base;
}

// Shows the thank-you panel once a visitor has started a donation.
// The site has no server, so this is shown when they leave for a payment
// app or copy the Bitcoin address, not when the payment is confirmed.
function showThanks() {
  const box = document.getElementById("thanksBox");
  if (box) {
    box.removeAttribute("hidden");
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function disableMethod(card) {
  if (!card) return;
  card.querySelector(".method-body")?.setAttribute("hidden", "");
  card.querySelector(".method-off")?.removeAttribute("hidden");
}

// ---------------------------------------------------------------------
// Home page (index.html): choose an amount, then go to donations.html
// ---------------------------------------------------------------------
function initHomePage() {
  const donateBtn = document.getElementById("donateBtn");
  if (!donateBtn) return;

  const chips = document.querySelectorAll(".chip");
  const customInput = document.getElementById("customAmount");

  const setAmount = (amount) => {
    donateBtn.href = amount
      ? `donations.html?amount=${amount}`
      : "donations.html";
    donateBtn.textContent = amount
      ? `Donate ${formatMoney(amount).replace(/\.00$/, "")}`
      : "Donate";
  };

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      customInput.value = "";
      setAmount(Number(chip.dataset.amount));
    });
  });

  customInput.addEventListener("input", () => {
    chips.forEach((c) => c.classList.remove("active"));
    setAmount(cleanAmount(customInput.value));
  });

  setAmount(CONFIG.defaultAmount);
}

// ---------------------------------------------------------------------
// Donations page (donations.html)
// ---------------------------------------------------------------------
function initDonationsPage() {
  const amountInput = document.getElementById("amountInput");
  if (!amountInput) return;

  const params = new URLSearchParams(window.location.search);
  const raw = params.get("amount");
  const initial = raw === null ? CONFIG.defaultAmount : cleanAmount(raw);

  amountInput.value = initial ?? "";

  const amountLabel = document.getElementById("amountLabel");
  const paypalLink = document.getElementById("paypalLink");
  const cashLink = document.getElementById("cashLink");

  [paypalLink, cashLink].forEach((link) => {
    link?.addEventListener("click", showThanks);
  });

  const render = (amount) => {
    amountLabel.textContent = amount ? formatMoney(amount) : "Any amount";
    if (paypalLink) paypalLink.href = paypalUrl(amount);
    if (cashLink) cashLink.href = cashAppUrl(amount);
  };

  amountInput.addEventListener("input", () => {
    render(cleanAmount(amountInput.value));
  });

  render(initial);
}

// ---------------------------------------------------------------------
// Payment methods on donations.html
// ---------------------------------------------------------------------
function setupPaymentMethods() {
  const btcCard = document.getElementById("btcCard");
  if (!btcCard) return;

  // Bitcoin
  if (isConfigured(CONFIG.bitcoinAddress)) {
    const address = CONFIG.bitcoinAddress;
    document.getElementById("btcAddress").textContent = address;
    document.getElementById("btcWalletLink").href = `bitcoin:${address}`;

    const qrTarget = document.getElementById("btcQr");
    if (typeof QRCode !== "undefined") {
      new QRCode(qrTarget, {
        text: `bitcoin:${address}`,
        width: 180,
        height: 180,
        colorDark: "#2b2118",
        colorLight: "#ffffff",
      });
    } else {
      qrTarget.textContent = "QR code unavailable. Copy the address below.";
    }

    document.getElementById("copyBtn").addEventListener("click", async () => {
      const status = document.getElementById("copyStatus");
      try {
        await navigator.clipboard.writeText(address);
      } catch {
        // Fallback for browsers that block the Clipboard API
        const range = document.createRange();
        range.selectNode(document.getElementById("btcAddress"));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand("copy");
        window.getSelection().removeAllRanges();
      }
      status.textContent =
        "Address copied. Double-check it in your wallet before sending.";
      showThanks();
    });
  } else {
    disableMethod(btcCard);
  }

  // PayPal
  if (!isConfigured(CONFIG.paypalHandle)) {
    disableMethod(document.getElementById("paypalCard"));
  }

  // Cash App
  if (!isConfigured(CONFIG.cashAppTag)) {
    disableMethod(document.getElementById("cashCard"));
  }
}

// ---------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  initHomePage();
  initDonationsPage();
  setupPaymentMethods();
});
