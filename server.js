require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, "[]", "utf8");

function readOrders() {
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8")); }
  catch { return []; }
}
function saveOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf8");
}
function clean(value, max = 2000) {
  return String(value || "").trim().slice(0, max);
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.get("/api/config", (_req, res) => {
  res.json({
    paypalClientId: process.env.PAYPAL_CLIENT_ID || "",
    contactEmail: process.env.CONTACT_EMAIL || "",
    whatsappNumber: process.env.WHATSAPP_NUMBER || ""
  });
});

app.post("/api/orders", (req, res) => {
  const name = clean(req.body.name, 120);
  const email = clean(req.body.email, 200);
  const service = clean(req.body.service, 160);
  const deadline = clean(req.body.deadline, 80);
  const details = clean(req.body.details, 5000);
  const level = clean(req.body.level, 120);
  if (!name || !isValidEmail(email) || !service || !details) {
    return res.status(400).json({ error: "Please complete your name, valid email, service, and project details." });
  }

  const orders = readOrders();
  const order = {
    id: "AP-" + Date.now().toString(36).toUpperCase(),
    name, email, service, deadline, level, details,
    status: "New request",
    createdAt: new Date().toISOString()
  };
  orders.unshift(order);
  saveOrders(orders);
  res.status(201).json({ message: "Your request has been received.", orderId: order.id });
});

function paypalBase() {
  return process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}
async function paypalAccessToken() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret || id.startsWith("your_")) {
    throw new Error("PayPal is not configured yet. Add your PayPal API credentials to the .env file.");
  }
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const response = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || "Could not connect to PayPal.");
  return data.access_token;
}

app.post("/api/paypal/create-order", async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const description = clean(req.body.description || "AcademicPro service payment", 120);
    if (!Number.isFinite(amount) || amount < 1 || amount > 10000) {
      return res.status(400).json({ error: "Enter a valid agreed payment amount between 1 and 10,000 USD." });
    }
    const token = await paypalAccessToken();
    const response = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          description,
          amount: { currency_code: "USD", value: amount.toFixed(2) }
        }],
        application_context: {
          brand_name: "AcademicPro",
          user_action: "PAY_NOW",
          return_url: `${process.env.SITE_URL || `http://localhost:${PORT}`}/?payment=success`,
          cancel_url: `${process.env.SITE_URL || `http://localhost:${PORT}`}/?payment=cancelled`
        }
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data.message || "PayPal could not create the payment." });
    res.json({ id: data.id, approvalUrl: data.links?.find(link => link.rel === "approve")?.href });
  } catch (error) {
    res.status(500).json({ error: error.message || "Payment setup failed." });
  }
});

app.post("/api/paypal/capture-order", async (req, res) => {
  try {
    const orderId = clean(req.body.orderId, 100);
    if (!orderId) return res.status(400).json({ error: "Missing PayPal order ID." });
    const token = await paypalAccessToken();
    const response = await fetch(`${paypalBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data.message || "Payment could not be captured." });
    res.json({ status: data.status, message: data.status === "COMPLETED" ? "Payment completed." : "Payment status: " + data.status });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not confirm payment." });
  }
});

// Basic password-protected admin endpoint. Use HTTPS and a strong password in production.
app.get("/api/admin/orders", (req, res) => {
  const expected = process.env.ADMIN_PASSWORD;
  const supplied = req.headers["x-admin-password"];
  if (!expected || expected === "change-this-to-a-long-random-password" || supplied !== expected) {
    return res.status(401).json({ error: "Unauthorized. Configure ADMIN_PASSWORD and provide it in the request header." });
  }
  res.json(readOrders());
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => {
  console.log(`AcademicPro is running at http://localhost:${PORT}`);
});
