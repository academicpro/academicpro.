# AcademicPro website

A responsive custom website starter for AcademicPro. It includes:
- Professional homepage and service pages/sections
- Responsive mobile navigation
- Support request form that saves enquiries to `data/orders.json`
- PayPal Checkout API integration (USD) for payments after a fee is agreed
- Basic password-protected endpoint to retrieve enquiries
- Editable business contact details

## Requirements
- Node.js 18 or later
- A PayPal Business account / PayPal Developer app for API credentials
- Hosting that supports a Node.js server for working forms and PayPal checkout

## Run locally
1. Install Node.js 18+.
2. Extract this folder.
3. Open a terminal in this folder.
4. Run `npm install`.
5. Copy `.env.example` to `.env`.
6. Edit `.env` and add your details. Leave `PAYPAL_ENV=sandbox` while testing.
7. Run `npm start`.
8. Visit `http://localhost:3000`.

## Configure contact details
In `.env`, set:
- `CONTACT_EMAIL=your real business email`
- `WHATSAPP_NUMBER=your country code and number, digits only`
- `SITE_URL=http://localhost:3000` for local testing; set this to your deployed HTTPS domain after publishing.

## Configure PayPal
1. Sign in to PayPal Developer.
2. Create a REST API app and copy its Client ID and Secret.
3. Put them in `.env` as `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`.
4. Use `PAYPAL_ENV=sandbox` and sandbox credentials to test.
5. Before accepting real payments, switch to `PAYPAL_ENV=live` and use live credentials.
6. Set `SITE_URL` to your deployed HTTPS website.
Never put your PayPal secret in front-end JavaScript or share the `.env` file publicly.

The payment form accepts a USD amount only. Use it only after you have confirmed the price with the customer. The site does not automatically set service prices.

## View submitted requests
Enquiries are stored in `data/orders.json` on the server. A basic protected endpoint is available:
`GET /api/admin/orders` with the header `x-admin-password: YOUR_ADMIN_PASSWORD`.

Set a long, unique `ADMIN_PASSWORD` in `.env` before using this endpoint. This is a minimal starter, not a full admin dashboard. Do not expose the endpoint over plain HTTP or use a weak password. For a production launch, replace the basic password endpoint with proper authentication, access controls, database storage and audit logging.

## Before launching publicly
- Add the real contact email and WhatsApp number.
- Add a privacy policy and terms of service appropriate to your business and jurisdictions.
- Configure HTTPS and secure production hosting.
- Use a managed database and proper admin authentication rather than local JSON storage for a high-volume business.
- Configure email notifications so you are alerted when a new request arrives.
- Test forms, PayPal sandbox checkout, cancellation and payment capture end-to-end.
- Review the wording and services to ensure they comply with the academic integrity policies of the institutions you serve.

## Important
This is a working starter project, not a hosted live website. The files must be run locally or deployed to a server before customers can use the form and checkout. No real payment credentials are included.
