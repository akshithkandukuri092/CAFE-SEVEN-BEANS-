import sgMail from '@sendgrid/mail';

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Function to send email
export async function sendEmail(to, subject, html) {
  try {
    const msg = {
      to,
      from: 'SevenBeansemail@gmail.com', // Replace with your verified sender
      subject,
      html,
    };

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
    <p>Dear ${booking.userName},</p>
    <p>Your booking has been confirmed:</p>
    <ul>
      <li><strong>Space:</strong> ${booking.spaceLabel}</li>
      <li><strong>Unit:</strong> ${booking.unitLabel}</li>
      <li><strong>Date:</strong> ${booking.date}</li>
      <li><strong>Time:</strong> ${booking.slots.join(', ')}</li>
      <li><strong>Duration:</strong> ${booking.duration}</li>
      <li><strong>Guests:</strong> ${booking.guests}</li>
      <li><strong>Total Amount:</strong> ₹${booking.grandTotal}</li>
    </ul>
    <p>Thank you for choosing SevenBeans!</p>
  `;
  return sendEmail(booking.userEmail, subject, html);
}

export async function sendBookingCancellation(booking, cancelledBy, refundAmount = null) {
  // Calculate refund: 70% of space price (food is non-refundable)
  const spaceRefund = Math.round(booking.spacePrice * 0.7);
  const actualRefund = refundAmount !== null ? refundAmount : spaceRefund;

  const subject = `Booking Cancelled - ${booking.spaceLabel} at SevenBeans`;
  const html = `
    <h2>Booking Cancelled</h2>
    <p>Dear ${booking.userName},</p>
    <p>Your booking has been cancelled${cancelledBy === 'admin' ? ' by our team' : ''}:</p>
    <ul>
      <li><strong>Space:</strong> ${booking.spaceLabel}</li>
      <li><strong>Unit:</strong> ${booking.unitLabel}</li>
      <li><strong>Date:</strong> ${booking.date}</li>
      <li><strong>Time:</strong> ${booking.slots.join(', ')}</li>
      <li><strong>Space Amount:</strong> ₹${booking.spacePrice}</li>
      <li><strong>Food Amount:</strong> ₹${booking.foodTotal} (Non-refundable)</li>
      <li><strong>Total Amount:</strong> ₹${booking.grandTotal}</li>
    </ul>
    ${actualRefund > 0 ? `<p><strong>Refund Amount:</strong> ₹${actualRefund} (70% of space charges)</p>` : '<p><strong>No refund applicable.</strong></p>'}
    <p>If you have any questions, please contact us.</p>
  `;
  return sendEmail(booking.userEmail, subject, html);
}

export async function sendBookingCompletion(booking) {
  const subject = `Booking Completed - Thank you for visiting SevenBeans!`;
  const html = `
    <h2>Thank you for your visit!</h2>
    <p>Dear ${booking.userName},</p>
    <p>Your booking has been completed:</p>
    <ul>
      <li><strong>Space:</strong> ${booking.spaceLabel}</li>
      <li><strong>Unit:</strong> ${booking.unitLabel}</li>
      <li><strong>Date:</strong> ${booking.date}</li>
      <li><strong>Time:</strong> ${booking.slots.join(', ')}</li>
    </ul>
    <p>We hope you enjoyed your time at SevenBeans. Please consider leaving a review!</p>
  `;
  return sendEmail(booking.userEmail, subject, html);
}