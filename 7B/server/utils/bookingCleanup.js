import Booking from "../models/Booking.js";
import { sendBookingCompletion } from "./emailService.js";

/**
 * Automatically transitions all past 'confirmed' bookings to 'completed'
 * once their scheduled session has ended.
 */
export async function autoCompletePastBookings() {
  try {
    const confirmedBookings = await Booking.find({ status: "confirmed" });
    if (confirmedBookings.length === 0) return;

    const now = new Date();
    
    for (const b of confirmedBookings) {
      if (!b.date) continue;
      
      // Determine slot start e.g. "10:00"
      const slotTime = b.slot || (b.slots && b.slots[0]) || "00:00";
      const durationHrs = Number(b.durationHrs) || 1;
      
      const [sh, sm] = slotTime.split(":").map(Number);
      if (isNaN(sh) || isNaN(sm)) {
        console.warn(`⚠️ Skipping cleanup for booking ${b._id} due to invalid slot time: ${slotTime}`);
        continue;
      }
      
      // Parse in India Standard Time (+05:30) to handle server timezone variations
      const pad = (n) => String(n).padStart(2, "0");
      const startStr = `${b.date}T${pad(sh)}:${pad(sm)}:00+05:30`;
      const bookingStart = new Date(startStr);
      
      if (isNaN(bookingStart.getTime())) {
        console.warn(`⚠️ Invalid date computed for booking ${b._id}: ${startStr}`);
        continue;
      }
      
      // Compute the end time of the booking slot
      const bookingEnd = new Date(bookingStart.getTime() + durationHrs * 60 * 60 * 1000);

      if (now >= bookingEnd) {
        // Atomic update to avoid race conditions (e.g. concurrent client requests executing this concurrently)
        const updated = await Booking.findOneAndUpdate(
          { _id: b._id, status: "confirmed" },
          { status: "completed" },
          { new: true }
        );
        
        if (updated) {
          console.log(`✅ Auto-completed past booking ${b._id} (Scheduled end: ${bookingEnd.toISOString()})`);
          
          // Dispatch completion email to guest
          try {
            await sendBookingCompletion(updated);
          } catch (emailError) {
            console.error(`Failed to send auto-completion email for ${b._id}:`, emailError);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error in autoCompletePastBookings:", err);
  }
}

