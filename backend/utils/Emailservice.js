const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const emailTemplates = {
  welcome: (name) => ({
    subject: '🌱 Welcome to Donateo!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 10px;">
        <div style="background: linear-gradient(135deg, #2e8b57, #3a9d6e); padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: white; margin: 0;">💚 Welcome to Donateo!</h1>
        </div>
        <div style="padding: 30px; background: white; border-radius: 0 0 10px 10px;">
          <h2 style="color: #2e8b57;">Hello, ${name}! 👋</h2>
          <p style="color: #555; line-height: 1.6;">Thank you for joining our community-driven donation platform. You're now part of a movement that promotes kindness, sustainability, and community support.</p>
          <div style="background: #f0f9f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2e8b57; margin-top: 0;">What you can do on Donateo:</h3>
            <ul style="color: #555; line-height: 2;">
              <li>🎁 Donate items you no longer need</li>
              <li>🤲 Request items from other community members</li>
              <li>💬 Chat and coordinate pickups securely</li>
              <li>🌍 Help reduce waste and support those in need</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background: #2e8b57; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">Start Exploring →</a>
          </div>
          <p style="color: #888; font-size: 0.85rem; text-align: center;">Donateo — Share What You Don't Need. Help Someone Who Does. 🌱</p>
        </div>
      </div>
    `
  }),

  item_approved: (name, itemName) => ({
    subject: `✅ Your item "${itemName}" has been approved!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2e8b57, #3a9d6e); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">✅ Item Approved!</h1>
        </div>
        <div style="padding: 30px; background: white; border-radius: 0 0 10px 10px; border: 1px solid #eee;">
          <p style="color: #555;">Hi <strong>${name}</strong>,</p>
          <p style="color: #555; line-height: 1.6;">Great news! Your item <strong style="color: #2e8b57;">"${itemName}"</strong> has been approved by our admin and is now live on Donateo.</p>
          <p style="color: #555;">Receivers can now browse and request your item. You'll be notified when someone requests it.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="background: #2e8b57; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">View Dashboard →</a>
          </div>
        </div>
      </div>
    `
  }),

  item_requested: (donorName, itemName, receiverName) => ({
    subject: `🔔 Someone requested your item "${itemName}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2e8b57, #3a9d6e); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">🔔 New Request!</h1>
        </div>
        <div style="padding: 30px; background: white; border-radius: 0 0 10px 10px; border: 1px solid #eee;">
          <p style="color: #555;">Hi <strong>${donorName}</strong>,</p>
          <p style="color: #555; line-height: 1.6;"><strong style="color: #2e8b57;">${receiverName}</strong> has requested your item <strong>"${itemName}"</strong>.</p>
          <p style="color: #555;">Log in to your dashboard to review the request and approve or decline it.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="background: #2e8b57; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">Review Request →</a>
          </div>
        </div>
      </div>
    `
  }),

  request_approved: (receiverName, itemName, donorName) => ({
    subject: `🎉 Your request for "${itemName}" was approved!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2e8b57, #3a9d6e); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">🎉 Request Approved!</h1>
        </div>
        <div style="padding: 30px; background: white; border-radius: 0 0 10px 10px; border: 1px solid #eee;">
          <p style="color: #555;">Hi <strong>${receiverName}</strong>,</p>
          <p style="color: #555; line-height: 1.6;">Your request for <strong style="color: #2e8b57;">"${itemName}"</strong> has been approved by <strong>${donorName}</strong>!</p>
          <p style="color: #555;">A chat has been opened for you to coordinate the pickup details.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="background: #2e8b57; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">Open Chat →</a>
          </div>
        </div>
      </div>
    `
  }),

  pickup_details_set: (receiverName, itemName, location, date, time) => ({
    subject: `📍 Pickup details set for "${itemName}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2e8b57, #3a9d6e); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">📍 Pickup Details</h1>
        </div>
        <div style="padding: 30px; background: white; border-radius: 0 0 10px 10px; border: 1px solid #eee;">
          <p style="color: #555;">Hi <strong>${receiverName}</strong>,</p>
          <p style="color: #555;">Pickup details have been set for <strong style="color: #2e8b57;">"${itemName}"</strong>:</p>
          <div style="background: #f0f9f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #333;">📍 <strong>Location:</strong> ${location}</p>
            <p style="margin: 5px 0; color: #333;">📅 <strong>Date:</strong> ${date}</p>
            <p style="margin: 5px 0; color: #333;">🕐 <strong>Time:</strong> ${time}</p>
          </div>
          <p style="color: #555;">Please confirm these details in the chat.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="background: #2e8b57; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">Confirm Details →</a>
          </div>
        </div>
      </div>
    `
  }),

  item_handed_over: (receiverName, itemName) => ({
    subject: `📦 "${itemName}" is ready for pickup!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2e8b57, #3a9d6e); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">📦 Item Handed Over!</h1>
        </div>
        <div style="padding: 30px; background: white; border-radius: 0 0 10px 10px; border: 1px solid #eee;">
          <p style="color: #555;">Hi <strong>${receiverName}</strong>,</p>
          <p style="color: #555; line-height: 1.6;">The donor has confirmed that <strong style="color: #2e8b57;">"${itemName}"</strong> has been handed over. Please mark it as received on your dashboard.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="background: #2e8b57; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">Mark as Received →</a>
          </div>
        </div>
      </div>
    `
  }),

  item_received: (donorName, itemName, receiverName) => ({
    subject: `✅ "${itemName}" successfully received!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2e8b57, #3a9d6e); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">✅ Donation Complete!</h1>
        </div>
        <div style="padding: 30px; background: white; border-radius: 0 0 10px 10px; border: 1px solid #eee;">
          <p style="color: #555;">Hi <strong>${donorName}</strong>,</p>
          <p style="color: #555; line-height: 1.6;"><strong style="color: #2e8b57;">${receiverName}</strong> has confirmed receiving <strong>"${itemName}"</strong>. Thank you for your generosity! 💚</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="background: #2e8b57; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">View Dashboard →</a>
          </div>
        </div>
      </div>
    `
  }),

  new_item_posted: (adminName, itemName, donorName) => ({
    subject: `🆕 New item posted: "${itemName}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2e8b57, #3a9d6e); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">🆕 New Item Needs Approval</h1>
        </div>
        <div style="padding: 30px; background: white; border-radius: 0 0 10px 10px; border: 1px solid #eee;">
          <p style="color: #555;">Hi <strong>${adminName}</strong>,</p>
          <p style="color: #555; line-height: 1.6;"><strong style="color: #2e8b57;">${donorName}</strong> has posted a new item <strong>"${itemName}"</strong> that needs your approval.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin" style="background: #2e8b57; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">Review in Admin Panel →</a>
          </div>
        </div>
      </div>
    `
  }),

  new_user_registered: (adminName, newUserName, newUserEmail, role) => ({
    subject: `👤 New user registered: ${newUserName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2e8b57, #3a9d6e); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">👤 New User Registered</h1>
        </div>
        <div style="padding: 30px; background: white; border-radius: 0 0 10px 10px; border: 1px solid #eee;">
          <p style="color: #555;">Hi <strong>${adminName}</strong>,</p>
          <p style="color: #555; line-height: 1.6;">A new user has registered on Donateo:</p>
          <div style="background: #f0f9f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #333;">👤 <strong>Name:</strong> ${newUserName}</p>
            <p style="margin: 5px 0; color: #333;">📧 <strong>Email:</strong> ${newUserEmail}</p>
            <p style="margin: 5px 0; color: #333;">🎭 <strong>Role:</strong> ${role}</p>
          </div>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin" style="background: #2e8b57; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">View in Admin Panel →</a>
          </div>
        </div>
      </div>
    `
  })
};

const sendEmail = async (to, templateName, templateData) => {
  try {
    const template = emailTemplates[templateName](...templateData);
    await transporter.sendMail({
      from: `"Donateo 🌱" <${process.env.EMAIL_USER}>`,
      to,
      subject: template.subject,
      html: template.html
    });
  } catch (error) {
    console.error('Email send error:', error.message);
    // Don't throw — email failure shouldn't break the main action
  }
};

module.exports = { sendEmail };