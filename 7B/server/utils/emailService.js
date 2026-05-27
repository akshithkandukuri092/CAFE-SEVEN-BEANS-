import sgMail from '@sendgrid/mail';

// Function to send email
export async function sendEmail(to, subject, html) {
  try {
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'sevenbeans.notifications@gmail.com';
    const replyToEmail = process.env.SENDGRID_REPLY_TO || fromEmail;
    
    const msg = {
      to,
      from: fromEmail,
      replyTo: replyToEmail,
      subject,
      html,
    };

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const result = await sgMail.send(msg);
    console.log('Email sent via SendGrid:', result[0].statusCode);
    return result;
  } catch (error) {
    console.error('SendGrid email error:', error);
    throw error;
  }
}

// Specific email templates
export async function sendBookingConfirmation(booking) {
  const subject = `Booking Confirmed - ${booking.spaceLabel} at SevenBeans`;
  const html = `
    <h2>Booking Confirmed!</h2>
    <p>Dear ${booking.guestName || booking.userName},</p>
    <p>Your booking has been confirmed:</p>
    <ul>
      <li><strong>Space:</strong> ${booking.spaceLabel}</li>
      <li><strong>Unit:</strong> ${booking.unitLabel}</li>
      <li><strong>Date:</strong> ${booking.date}</li>
      <li><strong>Time:</strong> ${booking.slots.join(', ')}</li>
      <li><strong>Duration:</strong> ${booking.duration}</li>
      <li><strong>Guests:</strong> ${booking.guests}</li>
      <li><strong>Guest Name:</strong> ${booking.guestName || booking.userName}</li>
      ${booking.guestPhone ? `<li><strong>Guest Phone:</strong> ${booking.guestPhone}</li>` : ''}
      <li><strong>Total Amount:</strong> ₹${booking.grandTotal}</li>
    </ul>
    <p>Thank you for choosing SevenBeans!</p>
  `;
  return sendEmail(booking.userEmail, subject, html);
}

export async function sendBookingCancellation(booking, cancelledBy, refundAmount = null) {
  // Calculate refund: 100% if cancelled by admin, otherwise 70% of space price
  const expectedRefund = cancelledBy === "admin"
    ? (booking.grandTotal || 0)
    : Math.round((booking.spacePrice || 0) * 0.7);
  const actualRefund = refundAmount !== null ? refundAmount : expectedRefund;

  const subject = `Booking Cancelled - ${booking.spaceLabel} at SevenBeans`;
  const html = `
    <h2>Booking Cancelled</h2>
    <p>Dear ${booking.guestName || booking.userName},</p>
    <p>Your booking has been cancelled${cancelledBy === 'admin' ? ' by our team' : ''}:</p>
    <ul>
      <li><strong>Space:</strong> ${booking.spaceLabel}</li>
      <li><strong>Unit:</strong> ${booking.unitLabel}</li>
      <li><strong>Date:</strong> ${booking.date}</li>
      <li><strong>Time:</strong> ${booking.slots.join(', ')}</li>
      <li><strong>Guest Name:</strong> ${booking.guestName || booking.userName}</li>
      ${booking.guestPhone ? `<li><strong>Guest Phone:</strong> ${booking.guestPhone}</li>` : ''}
      <li><strong>Space Amount:</strong> ₹${booking.spacePrice}</li>
      <li><strong>Food Amount:</strong> ₹${booking.foodTotal} (Non-refundable)</li>
      <li><strong>Total Amount:</strong> ₹${booking.grandTotal}</li>
    </ul>
    ${actualRefund > 0 ? `<p><strong>Refund Amount:</strong> ₹${actualRefund} ${cancelledBy === 'admin' ? '(100% full refund)' : '(70% of space charges)'}</p>` : '<p><strong>No refund applicable.</strong></p>'}
    <p>If you have any questions, please contact us.</p>
  `;
  return sendEmail(booking.userEmail, subject, html);
}

export async function sendBookingCompletion(booking) {
  const subject = `Booking Completed - Thank you for visiting SevenBeans!`;
  const html = `
    <h2>Thank you for your visit!</h2>
    <p>Dear ${booking.guestName || booking.userName},</p>
    <p>Your booking has been completed:</p>
    <ul>
      <li><strong>Space:</strong> ${booking.spaceLabel}</li>
      <li><strong>Unit:</strong> ${booking.unitLabel}</li>
      <li><strong>Date:</strong> ${booking.date}</li>
      <li><strong>Time:</strong> ${booking.slots.join(', ')}</li>
      <li><strong>Guest Name:</strong> ${booking.guestName || booking.userName}</li>
      ${booking.guestPhone ? `<li><strong>Guest Phone:</strong> ${booking.guestPhone}</li>` : ''}
    </ul>
    <p>We hope you enjoyed your time at SevenBeans. Please consider leaving a review!</p>
  `;
  return sendEmail(booking.userEmail, subject, html);
}

export async function sendPasswordResetEmail(email, resetLink) {
  const subject = `Reset Your Password - SevenBeans`;
  const html = `
    <h2>Password Reset Request</h2>
    <p>You requested to reset your password for your SevenBeans account.</p>
    <p>Click the link below to set a new password:</p>
    <p><a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#6b3a1f;color:#fff;text-decoration:none;border-radius:5px;">Reset Password</a></p>
    <p>If you did not request this, please ignore this email.</p>
    <p>This link will expire in 1 hour.</p>
  `;
  return sendEmail(email, subject, html);
}

export async function sendRefundConfirmation(booking) {
  const subject = `Refund Processed - ${booking.spaceLabel} at SevenBeans`;
  const html = `
    <h2>Refund Processed Successfully</h2>
    <p>Dear ${booking.guestName || booking.userName},</p>
    <p>We have successfully processed a refund for your cancelled booking:</p>
    <ul>
      <li><strong>Space:</strong> ${booking.spaceLabel}</li>
      <li><strong>Unit:</strong> ${booking.unitLabel}</li>
      <li><strong>Date:</strong> ${booking.date}</li>
      <li><strong>Amount Paid:</strong> ₹${booking.grandTotal}</li>
      <li><strong>Cutting Charges:</strong> ₹${booking.grandTotal - booking.refundAmount} (30% space cutting charge + 100% food pre-order)</li>
      <li><strong>Refund Amount:</strong> ₹${booking.refundAmount} (70% of space charges)</li>
    </ul>
    <p>The refund will be credited back to your original payment method within 5-7 business days.</p>
    <p>Thank you for choosing SevenBeans!</p>
  `;
  return sendEmail(booking.userEmail, subject, html);
}