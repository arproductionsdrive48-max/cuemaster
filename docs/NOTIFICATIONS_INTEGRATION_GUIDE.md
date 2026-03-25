# 📲 Snook OS — Notifications Integration Guide

This guide walks you through getting the required credentials for SMS (Twilio), Email (SendGrid), and Push (Firebase FCM) notifications. Follow these steps exactly and paste the values into **Settings → Notification Setup** in the Snook OS admin app.

---

## 1. 📱 SMS Notifications via Twilio

### Step 1 — Create a Twilio Account
1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a free account (no credit card needed for trial)
3. Verify your phone number

### Step 2 — Get Your Account SID & Auth Token
1. Log in to [https://console.twilio.com](https://console.twilio.com)
2. On the **Dashboard**, you will see:
   - **Account SID** — starts with `AC...`
   - **Auth Token** — click the 🔒 eye icon to reveal it
3. Copy both of these — paste into Snook OS Settings

### Step 3 — Get a Twilio Phone Number (India)
1. In the Twilio Console, go to **Phone Numbers → Manage → Buy a Number**
2. Set country to **India** and check **SMS capability**
3. Buy the number (₹0 during trial)
4. The number will look like `+91XXXXXXXXXX`
5. Paste this into the **Twilio Phone Number** field in Snook OS

### ✅ What the SMS will look like
> "Hi Rahul, your booking at Snook OS Club is confirmed for 7:00 PM on March 25. Table 3. — CueMaster"

---

## 2. 📧 Email Notifications via SendGrid

### Step 1 — Create a SendGrid Account
1. Go to [https://signup.sendgrid.com](https://signup.sendgrid.com)
2. Sign up for a free account (includes 100 emails/day free)
3. Verify your email address

### Step 2 — Create an API Key
1. Log in to [https://app.sendgrid.com](https://app.sendgrid.com)
2. Go to **Settings → API Keys**
3. Click **Create API Key**
4. Name it `Snook OS` and select **Full Access** (or at minimum, enable **Mail Send**)
5. Copy the key — it starts with `SG.` — **you will only see this once!**
6. Paste it into the **SendGrid API Key** field in Snook OS

### Step 3 — Verify a Sender Email
1. Go to **Settings → Sender Authentication**
2. Click **Verify a Single Sender**
3. Enter the email you want to send from (e.g., `bookings@yourclub.com`)
4. SendGrid will send a verification email — click the link in it
5. Use this verified email as the **From Email** in Snook OS

### ✅ What the email will look like
> **From:** bookings@yourclub.com  
> **Subject:** Booking Confirmed — Snook OS Club  
> "Hi Rahul, your booking is confirmed for Table 3 at 7:00 PM on March 25."

---

## 3. 🔔 Push Notifications via Firebase FCM

### Step 1 — Create a Firebase Project
1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add Project**
3. Name it `Snook OS` (or your club name)
4. Disable Google Analytics (optional, not needed)
5. Click **Create Project**

### Step 2 — Get the Project ID
1. In the Firebase Console, go to ⚙️ **Project Settings** (gear icon next to Project Overview)
2. Under the **General** tab, look for **Project ID**
3. It looks like `snook-os-xxxxx`
4. Paste this into the **Firebase Project ID** field in Snook OS

### Step 3 — Download the Service Account Key (JSON)
1. In **Project Settings**, click the **Service accounts** tab
2. Select **Firebase Admin SDK**
3. Click **Generate new private key**
4. Confirm the download — a JSON file will be saved to your computer
5. Go to Snook OS Settings → Notification Setup → Firebase card
6. Click **Upload serviceAccountKey.json** and select the downloaded file

> ⚠️ **Security:** Never share the service account JSON file with anyone. It gives full admin access to your Firebase project. Store it safely.

### Step 4 — Enable Cloud Messaging
1. In the Firebase Console go to **Build → Cloud Messaging**
2. If it says "Enable", click to enable it
3. No additional configuration needed — the app handles the rest

---

## 🔐 Security Notes

| Credential | Sensitivity | Where It's Stored |
|---|---|---|
| Twilio SID | Medium | Supabase `notification_config` table |
| Twilio Auth Token | **HIGH** | Supabase `notification_config` table (encrypted at rest) |
| SendGrid API Key | **HIGH** | Supabase `notification_config` table |
| Firebase Service JSON | **CRITICAL** | Supabase table + used by Edge Functions |

- After you paste credentials and click **Save**, the fields clear from the screen for security
- A **Connected ✓** badge appears on each card to confirm credentials are saved
- Credentials are protected by Row Level Security (RLS) — only your club account can access them

---

## 🚀 After Setup — Deploy Edge Functions

The test buttons in the Settings screen call Supabase Edge Functions. You need to deploy them once:

```bash
# From project root
supabase functions deploy send_test_sms
supabase functions deploy send_test_email
supabase functions deploy send_test_push
```

> Edge function source files will be in `supabase/functions/` once created.

---

## 🆘 Common Errors

| Error | Fix |
|---|---|
| `Twilio error 21211` | Invalid phone number format — use `+91XXXXXXXXXX` |
| `SendGrid 403 Forbidden` | Sender email not verified — verify it in SendGrid dashboard |
| `Firebase permission denied` | Wrong service account JSON — re-download from Firebase |
| `Edge function not found` | Deploy the functions first using the commands above |

---

*Last updated: March 2026 — Snook OS v2*
