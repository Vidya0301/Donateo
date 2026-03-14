const nodemailer = require('nodemailer');

// ── Primary: Brevo (best deliverability, free 300/day) ──
const brevoTransporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,   // your Brevo login email
    pass: process.env.BREVO_PASS    // your Brevo SMTP key (not your password)
  }
});

// ── Fallback: Gmail (if Brevo not configured) ──
const gmailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const getTransporter = () => {
  if (process.env.BREVO_USER && process.env.BREVO_PASS) return brevoTransporter;
  return gmailTransporter;
};

// ── Shared email styles ──
const baseStyle = `
  font-family: Arial, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
`;
const headerStyle = `
  background: linear-gradient(135deg, #2e8b57, #3a9d6e);
  padding: 28px 30px;
  text-align: center;
`;
const bodyStyle = `padding: 30px; background: white;`;
const btnStyle = `
  display: inline-block;
  background: #2e8b57;
  color: white;
  padding: 12px 30px;
  border-radius: 25px;
  text-decoration: none;
  font-weight: bold;
  margin-top: 20px;
`;
const footerStyle = `
  background: #f9f9f9;
  padding: 15px 30px;
  text-align: center;
  color: #999;
  font-size: 0.8rem;
  border-top: 1px solid #eee;
`;

const wrap = (headerText, bodyHtml, btnText, btnLink) => `
<div style="${baseStyle}">
  <div style="${headerStyle}">
    <h1 style="color:white;margin:0;font-size:1.4rem;">💚 ${headerText}</h1>
  </div>
  <div style="${bodyStyle}">
    ${bodyHtml}
    <div style="text-align:center;">
      <a href="${btnLink}" style="${btnStyle}">${btnText}</a>
    </div>
  </div>
  <div style="${footerStyle}">
    Donateo — Share What You Don't Need. Help Someone Who Does. 🌱<br/>
    <small>You received this because you're a member of Donateo.</small>
  </div>
</div>`;

const URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const emailTemplates = {
  otp_verification: (name, otp) => ({
    subject: '🔐 Your Donateo Verification OTP',
    text: `Hi ${name}, your Donateo OTP is: ${otp}. It expires in 10 minutes.`,
    html: wrap(
      'Verify Your Email',
      `<h2 style="color:#1a2e1e;font-size:18px;">Hi ${name}, verify your email 👋</h2>
       <p style="color:#555;line-height:1.7;">Thank you for registering on Donateo! Use the OTP below to verify your email and activate your account.</p>
       <div style="background:#f0f9f4;border:2px dashed #2e8b57;border-radius:14px;padding:28px;text-align:center;margin:20px 0;">
         <p style="color:#777;font-size:13px;margin:0 0 10px;">Your One-Time Password</p>
         <h1 style="color:#2e8b57;font-size:52px;letter-spacing:14px;margin:0;font-weight:900;">${otp}</h1>
         <p style="color:#e07b30;font-size:12px;margin:14px 0 0;">⏰ This OTP expires in <strong>10 minutes</strong></p>
       </div>
       <p style="color:#aaa;font-size:11px;text-align:center;">If you did not create a Donateo account, please ignore this email.</p>`,
      'Go to Donateo →', URL
    )
  }),

  welcome: (name) => ({
    subject: '🌱 Welcome to Donateo!',
    text: `Hi ${name}! Welcome to Donateo. Thank you for joining our community. Start exploring at ${URL}`,
    html: wrap(
      'Welcome to Donateo!',
      `<h2 style="color:#2e8b57;">Hello, ${name}! 👋</h2>
       <p style="color:#555;line-height:1.7;">Thank you for joining our community-driven donation platform. You're now part of a movement that promotes kindness, sustainability, and community support.</p>
       <div style="background:#f0f9f4;padding:20px;border-radius:8px;margin:20px 0;">
         <p style="margin:0 0 8px;color:#333;font-weight:600;">What you can do on Donateo:</p>
         <ul style="color:#555;line-height:2;margin:0;padding-left:20px;">
           <li>🎁 Donate items you no longer need</li>
           <li>🤲 Request items from other community members</li>
           <li>💬 Chat and coordinate pickups securely</li>
           <li>🌍 Help reduce waste and support those in need</li>
         </ul>
       </div>`,
      'Start Exploring →', URL
    )
  }),

  item_approved: (name, itemName) => ({
    subject: `✅ Your item "${itemName}" has been approved!`,
    text: `Hi ${name}, your item "${itemName}" has been approved and is now live on Donateo. Visit ${URL}/dashboard`,
    html: wrap(
      'Item Approved!',
      `<p style="color:#555;">Hi <strong>${name}</strong>,</p>
       <p style="color:#555;line-height:1.7;">Great news! Your item <strong style="color:#2e8b57;">"${itemName}"</strong> has been approved by our admin and is now live on Donateo.</p>
       <p style="color:#555;">Receivers can now browse and request your item. You'll be notified when someone requests it.</p>`,
      'View Dashboard →', `${URL}/dashboard`
    )
  }),

  item_requested: (donorName, itemName, receiverName) => ({
    subject: `🔔 Someone requested your item "${itemName}"`,
    text: `Hi ${donorName}, ${receiverName} has requested your item "${itemName}". Visit ${URL}/dashboard to review.`,
    html: wrap(
      'New Item Request!',
      `<p style="color:#555;">Hi <strong>${donorName}</strong>,</p>
       <p style="color:#555;line-height:1.7;"><strong style="color:#2e8b57;">${receiverName}</strong> has requested your item <strong>"${itemName}"</strong>.</p>
       <p style="color:#555;">Log in to your dashboard to review and approve the request.</p>`,
      'Review Request →', `${URL}/dashboard`
    )
  }),

  request_approved: (receiverName, itemName, donorName) => ({
    subject: `🎉 Your request for "${itemName}" was approved!`,
    text: `Hi ${receiverName}, your request for "${itemName}" was approved by ${donorName}. Visit ${URL}/dashboard to open the chat.`,
    html: wrap(
      'Request Approved! 🎉',
      `<p style="color:#555;">Hi <strong>${receiverName}</strong>,</p>
       <p style="color:#555;line-height:1.7;">Your request for <strong style="color:#2e8b57;">"${itemName}"</strong> has been approved by <strong>${donorName}</strong>!</p>
       <p style="color:#555;">A chat has been opened for you to coordinate the pickup details.</p>`,
      'Open Chat →', `${URL}/dashboard`
    )
  }),



  request_denied: (itemName, donorName) => ({
    subject: `Your request for "${itemName}" was not selected`,
    text: `Hi, unfortunately your request for "${itemName}" was not selected by the donor. Don't give up — browse more items at ${URL}/browse`,
    html: wrap(
      '❌ Request Not Selected',
      `<p style="color:#555;">Hi there,</p>
       <p style="color:#555;">Unfortunately, your request for <strong style="color:#2e8b57;">"${itemName}"</strong> was not selected by the donor this time.</p>
       <p style="color:#555;">Don't be discouraged — there are plenty of other items available on Donateo!</p>
       <p style="color:#888;font-size:0.9rem;">Donor: ${donorName}</p>`,
      'Browse More Items →', `${URL}/browse`
    )
  }),

  pickup_reminder: (recipientName, itemName, location, date, time, role) => ({
    subject: `⏰ Pickup Reminder: "${itemName}" is tomorrow!`,
    text: `Hi ${recipientName}, reminder: pickup for "${itemName}" is tomorrow. Location: ${location}, Date: ${date}, Time: ${time}. Visit ${URL}/dashboard.`,
    html: wrap(
      '⏰ Pickup Reminder',
      `<p style="color:#555;">Hi <strong>${recipientName}</strong>,</p>
       <p style="color:#555;">This is a friendly reminder that your pickup for <strong style="color:#2e8b57;">"${itemName}"</strong> is <strong>tomorrow</strong>!</p>
       <div style="background:#fff8e7;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #f59e0b;">
         <p style="margin:5px 0;color:#333;">📍 <strong>Location:</strong> ${location}</p>
         <p style="margin:5px 0;color:#333;">📅 <strong>Date:</strong> ${date}</p>
         <p style="margin:5px 0;color:#333;">🕐 <strong>Time:</strong> ${time}</p>
         <p style="margin:5px 0;color:#333;">👤 <strong>Your role:</strong> ${role}</p>
       </div>
       <p style="color:#555;">Please make sure to be on time. If you need to reschedule, open the chat and coordinate with the other person.</p>`,
      'View on Dashboard →', `${URL}/dashboard`
    )
  }),


  request_denied: (itemName, donorName) => ({
    subject: `❌ Your request for "${itemName}" was not selected`,
    text: `Hi, your request for "${itemName}" was not selected by the donor. Keep browsing Donateo for other available items!`,
    html: wrap(
      'Request Not Selected',
      `<p style="color:#555;">Thank you for your interest in <strong style="color:#2e8b57;">"${itemName}"</strong>.</p>
       <p style="color:#555;">Unfortunately, the donor <strong>${donorName}</strong> has selected another recipient for this item.</p>
       <p style="color:#555;">Don't be discouraged — there are many more items available on Donateo. Keep browsing!</p>`,
      'Browse Available Items →', `${URL}/browse`
    )
  }),
  pickup_details_set: (receiverName, itemName, location, date, time) => ({
    subject: `📍 Pickup details set for "${itemName}"`,
    text: `Hi ${receiverName}, pickup for "${itemName}": Location: ${location}, Date: ${date}, Time: ${time}. Visit ${URL}/dashboard to confirm.`,
    html: wrap(
      'Pickup Details Set',
      `<p style="color:#555;">Hi <strong>${receiverName}</strong>,</p>
       <p style="color:#555;">Pickup details have been set for <strong style="color:#2e8b57;">"${itemName}"</strong>:</p>
       <div style="background:#f0f9f4;padding:20px;border-radius:8px;margin:20px 0;">
         <p style="margin:5px 0;color:#333;">📍 <strong>Location:</strong> ${location}</p>
         <p style="margin:5px 0;color:#333;">📅 <strong>Date:</strong> ${date}</p>
         <p style="margin:5px 0;color:#333;">🕐 <strong>Time:</strong> ${time}</p>
       </div>
       <p style="color:#555;">Please confirm these details in the chat.</p>`,
      'Confirm Details →', `${URL}/dashboard`
    )
  }),

  item_handed_over: (receiverName, itemName) => ({
    subject: `📦 "${itemName}" is ready for pickup!`,
    text: `Hi ${receiverName}, the donor confirmed handover of "${itemName}". Please mark it as received at ${URL}/dashboard`,
    html: wrap(
      'Item Handed Over! 📦',
      `<p style="color:#555;">Hi <strong>${receiverName}</strong>,</p>
       <p style="color:#555;line-height:1.7;">The donor has confirmed that <strong style="color:#2e8b57;">"${itemName}"</strong> has been handed over. Please mark it as received on your dashboard.</p>`,
      'Mark as Received →', `${URL}/dashboard`
    )
  }),

  item_received: (donorName, itemName, receiverName) => ({
    subject: `✅ "${itemName}" successfully received!`,
    text: `Hi ${donorName}, ${receiverName} confirmed receiving "${itemName}". Thank you for your donation!`,
    html: wrap(
      'Donation Complete! ✅',
      `<p style="color:#555;">Hi <strong>${donorName}</strong>,</p>
       <p style="color:#555;line-height:1.7;"><strong style="color:#2e8b57;">${receiverName}</strong> has confirmed receiving <strong>"${itemName}"</strong>. Thank you for your generosity! 💚</p>`,
      'View Dashboard →', `${URL}/dashboard`
    )
  }),

  new_item_posted: (adminName, itemName, donorName) => ({
    subject: `🆕 New item needs approval: "${itemName}"`,
    text: `Hi ${adminName}, ${donorName} posted "${itemName}" and it needs your approval. Visit ${URL}/admin`,
    html: wrap(
      'New Item Needs Approval',
      `<p style="color:#555;">Hi <strong>${adminName}</strong>,</p>
       <p style="color:#555;line-height:1.7;"><strong style="color:#2e8b57;">${donorName}</strong> has posted a new item <strong>"${itemName}"</strong> that needs your approval.</p>`,
      'Review in Admin Panel →', `${URL}/admin`
    )
  }),

  new_user_registered: (adminName, newUserName, newUserEmail, role) => ({
    subject: `👤 New user registered: ${newUserName}`,
    text: `Hi ${adminName}, ${newUserName} (${newUserEmail}) joined as a ${role}. Visit ${URL}/admin`,
    html: wrap(
      'New User Registered',
      `<p style="color:#555;">Hi <strong>${adminName}</strong>,</p>
       <p style="color:#555;line-height:1.7;">A new user has registered on Donateo:</p>
       <div style="background:#f0f9f4;padding:20px;border-radius:8px;margin:20px 0;">
         <p style="margin:5px 0;color:#333;">👤 <strong>Name:</strong> ${newUserName}</p>
         <p style="margin:5px 0;color:#333;">📧 <strong>Email:</strong> ${newUserEmail}</p>
         <p style="margin:5px 0;color:#333;">🎭 <strong>Role:</strong> ${role}</p>
       </div>`,
      'View in Admin Panel →', `${URL}/admin`
    )
  })
};

const sendEmail = async (to, templateName, templateData) => {
  try {
    const template = emailTemplates[templateName](...templateData);
    const transporter = getTransporter();
    const fromName = 'Donateo 🌱';
    const fromEmail = process.env.BREVO_USER || process.env.EMAIL_USER;

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      replyTo: process.env.EMAIL_USER,
      to,
      subject: template.subject,
      text: template.text,   // Plain text fallback — improves spam score
      html: template.html
    });
    console.log(`✅ Email sent [${templateName}] → ${to}`);
  } catch (error) {
    console.error(`❌ Email send error [${templateName}] → ${to}:`, error.message);
  }
};

module.exports = { sendEmail };