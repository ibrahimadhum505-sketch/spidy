const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Resend } = require('resend');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Spidy Shop Backend Server is running!',
    resendConfigured: Boolean(process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('your_resend_api_key_here'))
  });
});

// Helper function to build rich HTML Email
function generateOrderEmailHtml({ orderId, customer, cart, pricing, timestamp }) {
  const itemsHtml = cart.map(item => {
    const variantTag = item.variant ? `<span style="background:#e8e8e8; color:#000; padding:2px 8px; border-radius:12px; font-size:12px; font-weight:bold; margin-left:6px;">Variant: ${item.variant}</span>` : '';
    const itemTotal = (item.price * item.qty).toLocaleString();
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eeeeee;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div>
              <strong style="font-size: 15px; color: #111111;">${item.title}</strong>
              <div style="margin-top: 4px;">${variantTag}</div>
            </div>
          </div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: center; font-weight: bold; color: #333;">×${item.qty}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: right; color: #555;">৳${item.price}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: right; font-weight: bold; color: #000;">৳${itemTotal}</td>
      </tr>
    `;
  }).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>New Order #${orderId} - Spidy Shop</title>
  </head>
  <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f6; margin: 0; padding: 20px; color: #222222;">
    <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 2px solid #000000; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
      
      <!-- HEADER -->
      <div style="background: #000000; padding: 24px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px;">
          <span style="color: #ff2222;">SPIDY</span> SHOP
        </h1>
        <p style="color: #76e053; margin: 6px 0 0; font-size: 15px; font-weight: 600;">NEW ORDER NOTIFICATION</p>
      </div>

      <div style="padding: 24px 20px;">
        
        <!-- ORDER METADATA -->
        <div style="background: #f8f9fa; border-left: 4px solid #76e053; padding: 14px 16px; margin-bottom: 22px; border-radius: 0 8px 8px 0;">
          <h2 style="margin: 0 0 6px; font-size: 18px; color: #000000;">Order ID: #${orderId}</h2>
          <p style="margin: 0; color: #666666; font-size: 13.5px;">Received on: ${timestamp}</p>
        </div>

        <!-- CUSTOMER DETAILS -->
        <h3 style="margin: 0 0 12px; font-size: 16px; color: #000000; border-bottom: 2px solid #000; padding-bottom: 6px;">Customer & Delivery Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14.5px;">
          <tr>
            <td style="padding: 6px 0; width: 140px; color: #666; font-weight: bold;">Name:</td>
            <td style="padding: 6px 0; font-weight: bold; color: #000;">${customer.name || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-weight: bold;">Phone Number:</td>
            <td style="padding: 6px 0;">
              <a href="tel:${customer.phone}" style="color: #000000; font-weight: bold; text-decoration: underline;">${customer.phone || 'N/A'}</a>
            </td>
          </tr>
          ${customer.whatsapp ? `
          <tr>
            <td style="padding: 6px 0; color: #666; font-weight: bold;">WhatsApp:</td>
            <td style="padding: 6px 0;">
              <a href="https://wa.me/88${customer.whatsapp.replace(/[^\d]/g, '')}" style="color: #25D366; font-weight: bold; text-decoration: underline;">${customer.whatsapp}</a>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 6px 0; color: #666; font-weight: bold;">Full Address:</td>
            <td style="padding: 6px 0; color: #222; font-weight: 500;">
              ${customer.address || ''}<br/>
              ${customer.thana ? customer.thana + ', ' : ''}${customer.district ? customer.district + ', ' : ''}${customer.division || ''}
            </td>
          </tr>
          ${customer.note ? `
          <tr>
            <td style="padding: 6px 0; color: #666; font-weight: bold;">Order Note:</td>
            <td style="padding: 6px 0; color: #d32f2f; font-style: italic;">"${customer.note}"</td>
          </tr>
          ` : ''}
        </table>

        <!-- PRODUCT SUMMARY TABLE -->
        <h3 style="margin: 0 0 12px; font-size: 16px; color: #000000; border-bottom: 2px solid #000; padding-bottom: 6px;">Order Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f1f1f1; text-align: left; font-size: 13px; color: #555;">
              <th style="padding: 10px 12px;">Product</th>
              <th style="padding: 10px 12px; text-align: center;">Qty</th>
              <th style="padding: 10px 12px; text-align: right;">Price</th>
              <th style="padding: 10px 12px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- PRICING SUMMARY -->
        <div style="background: #fafafa; border: 1.5px solid #e0e0e0; border-radius: 8px; padding: 14px 18px; margin-bottom: 28px;">
          <table style="width: 100%; font-size: 15px;">
            <tr>
              <td style="padding: 4px 0; color: #555;">Subtotal:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold;">৳${(pricing.subtotal || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #555;">Delivery Charge:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold;">৳${(pricing.deliveryFee || 100).toLocaleString()}</td>
            </tr>
            <tr style="border-top: 1.5px solid #dddddd;">
              <td style="padding: 10px 0 4px; font-size: 18px; font-weight: 800; color: #000;">Total Payable (COD):</td>
              <td style="padding: 10px 0 4px; text-align: right; font-size: 20px; font-weight: 800; color: #000000;">৳${(pricing.total || 0).toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <!-- FOOTER SOCIAL & CONTACT INFO -->
        <div style="background: #000000; color: #ffffff; border-radius: 8px; padding: 18px; text-align: center;">
          <h4 style="margin: 0 0 10px; color: #ffffff; font-size: 15px;">SPIDY SHOP CONTACTS & SOCIALS</h4>
          
          <p style="margin: 4px 0; font-size: 13.5px; color: #dddddd;">
            📞 <strong>Phone / WhatsApp:</strong> <a href="tel:01735358678" style="color: #76e053; text-decoration: none;">01735358678</a> | <a href="https://wa.me/8801735358678" style="color: #76e053; text-decoration: none;">WhatsApp Link</a>
          </p>
          <p style="margin: 4px 0; font-size: 13.5px; color: #dddddd;">
            ✉️ <strong>Email:</strong> <a href="mailto:spidyshop.bng@gmail.com" style="color: #60c7f2; text-decoration: none;">spidyshop.bng@gmail.com</a>
          </p>

          <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #333; font-size: 13px;">
            <a href="https://www.tiktok.com/@spidy.ecommerce" style="color: #ffffff; margin: 0 8px; text-decoration: none;">🎵 TikTok</a> | 
            <a href="https://www.facebook.com/profile.php?id=61587919453376" style="color: #1877F2; margin: 0 8px; text-decoration: none;">📘 Facebook</a> | 
            <a href="https://www.instagram.com/spidyshop.official/?hl=en" style="color: #fd5949; margin: 0 8px; text-decoration: none;">📸 Instagram</a>
          </div>
        </div>

      </div>
    </div>
  </body>
  </html>
  `;
}

// POST endpoint for sending order emails via Resend
app.post('/api/send-order', async (req, res) => {
  try {
    const { orderId, customer, cart, pricing } = req.body;

    if (!customer || !cart || cart.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid order details provided' });
    }

    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });

    console.log(`\n========================================`);
    console.log(`RECEIVED NEW ORDER #${orderId}`);
    console.log(`Customer: ${customer.name} (${customer.phone})`);
    console.log(`Address: ${customer.address}, ${customer.thana}, ${customer.district}`);
    console.log(`Total: ৳${pricing ? pricing.total : 0}`);
    console.log(`========================================\n`);

    const htmlContent = generateOrderEmailHtml({
      orderId: orderId || Math.floor(100000 + Math.random() * 900000),
      customer,
      cart,
      pricing: pricing || { subtotal: 0, deliveryFee: 100, total: 100 },
      timestamp
    });

    const apiKey = process.env.RESEND_API_KEY;
    const recipientEmail = process.env.NOTIFICATION_EMAIL || 'spidyshop.bng@gmail.com';
    const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

    // Check if API Key is configured
    if (!apiKey || apiKey.includes('your_resend_api_key_here')) {
      console.warn('⚠️ WARNING: RESEND_API_KEY is not set in .env file yet. Order logged locally.');
      return res.json({
        success: true,
        mock: true,
        message: 'Order received! (Resend API key not added yet in .env - please paste your key to enable live emails)'
      });
    }

    // Initialize Resend
    const resend = new Resend(apiKey);

    const emailResponse = await resend.emails.send({
      from: `Spidy Shop Orders <${senderEmail}>`,
      to: [recipientEmail],
      subject: `🛒 New Order #${orderId} - ${customer.name} (৳${pricing.total})`,
      html: htmlContent
    });

    if (emailResponse.error) {
      console.error('❌ Resend Error:', emailResponse.error);
      return res.status(500).json({
        success: false,
        error: emailResponse.error.message || 'Failed to send order email via Resend'
      });
    }

    console.log('✅ Email notification successfully sent via Resend:', emailResponse);

    return res.json({
      success: true,
      data: emailResponse,
      message: 'Order notification sent successfully to spidyshop.bng@gmail.com!'
    });

  } catch (error) {
    console.error('❌ Error processing order server side:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server internal error'
    });
  }
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🚀 Spidy Shop Backend Running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📩 Recipient Email: ${process.env.NOTIFICATION_EMAIL || 'spidyshop.bng@gmail.com'}`);
  console.log(`🔑 API Key Loaded: ${process.env.RESEND_API_KEY ? (process.env.RESEND_API_KEY.substring(0, 7) + '...') : 'None'}`);
  console.log(`========================================\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ ERROR: Port ${PORT} is already in use.`);
    console.error(`👉 Solution: Stop any running node server on port ${PORT} and run 'npm start' again.\n`);
  } else {
    console.error('❌ Server Error:', err);
  }
});
