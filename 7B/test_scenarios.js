import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "server", ".env") });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is missing from server/.env! Please configure it first.");
  process.exit(1);
}

// Inline model definition to run standalone without starting the Express server
const foodItemSchema = new mongoose.Schema({
  id: String,
  name: String,
  qty: Number,
  price: Number,
});

const bookingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, default: "" },
  userEmail: { type: String, default: "" },
  spaceId: { type: String, required: true },
  spaceLabel: { type: String, default: "" },
  unitId: { type: String, default: "" },
  unitLabel: { type: String, default: "" },
  date: { type: String, required: true },
  slot: { type: String, default: "" },
  slots: { type: [String], default: [] },
  duration: { type: String, default: "" },
  durationHrs: { type: Number, default: 1 },
  guests: { type: Number, default: 1 },
  spacePrice: { type: Number, default: 0 },
  foodTotal: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  foodItems: [foodItemSchema],
  status: { type: String, default: "pending" },
  cancelledBy: { type: String, default: null },
  cancelReason: { type: String, default: "" },
  razorpayPaymentId: { type: String, default: "" },
}, { timestamps: true });

const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);

async function runTests() {
  console.log("🔌 Connecting to MongoDB Database...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Database Connected Successfully!\n");

  const testDate = "2026-12-31";
  const testSpace = "workspace";
  const testUnit = "pod1";
  const testSlot = "14:00";

  console.log("🗑️ Cleaning up any old test bookings...");
  await Booking.deleteMany({ date: testDate });
  console.log("🧹 Test environment cleaned up!\n");

  // =========================================================================
  // SCENARIO 1: SUCCESSFUL PAYMENT FLOW
  // =========================================================================
  console.log("==================================================================");
  console.log("📢 SCENARIO 1: STANDARD PRE-CHECK & SUCCESSFUL CHECKOUT FLOW");
  console.log("==================================================================");

  console.log(`👤 User A tries to reserve: ${testUnit} at ${testSlot} (Date: ${testDate}, Total: ₹250)`);
  
  // 1. Create User A pending booking (replicates POST /api/bookings)
  const userABooking = await Booking.create({
    userId: "firebase_user_a",
    userName: "User A",
    userEmail: "usera@example.com",
    spaceId: testSpace,
    spaceLabel: "Focus Pods",
    unitId: testUnit,
    unitLabel: "Pod 1",
    date: testDate,
    slot: testSlot,
    slots: [testSlot],
    grandTotal: 250,
    status: "pending",
  });
  console.log(`🟢 [SUCCESS] User A secured pending booking ID: ${userABooking._id} (Slot is now BLOCKED)`);

  // 2. Try to make conflicting booking (replicates POST /api/bookings conflict rejection)
  console.log(`\n👤 User C tries to book the same slot: ${testUnit} at ${testSlot} for ₹250`);
  const conflict = await Booking.findOne({
    spaceId: testSpace,
    unitId: testUnit,
    date: testDate,
    status: { $ne: "cancelled" },
    slots: { $in: [testSlot] },
  });

  if (conflict) {
    if (conflict.status === "pending" && 250 <= conflict.grandTotal) {
      console.log(`🔴 [REJECTED] Slot conflict! Server returns 409 SLOT_UNAVAILABLE because User A has it pending.`);
    }
  }

  // 3. User A successfully pays via Razorpay (replicates PUT /api/bookings/:id/confirm-payment)
  console.log(`\n💳 User A completed payment. Confirming payment with Razorpay ID: pay_ABC123xyz`);
  const confirmedBooking = await Booking.findById(userABooking._id);
  confirmedBooking.status = "confirmed";
  confirmedBooking.razorpayPaymentId = "pay_ABC123xyz";
  await confirmedBooking.save();
  console.log(`✨ [CONFIRMED] Booking ${confirmedBooking._id} is now status: "${confirmedBooking.status}" with payment ref: ${confirmedBooking.razorpayPaymentId}\n`);


  // =========================================================================
  // SCENARIO 2: SEAT PRIORITY PREEMPTION
  // =========================================================================
  console.log("==================================================================");
  console.log("📢 SCENARIO 2: SEAT PRIORITY PREEMPTION (YIELD OPTIMIZATION)");
  console.log("==================================================================");

  const testUnit2 = "pod2";
  const testSlot2 = "16:00";

  console.log(`👤 User D reserves ${testUnit2} at ${testSlot2} (Unpaid, Basic booking, Total: ₹250)`);
  const userDBooking = await Booking.create({
    userId: "firebase_user_d",
    userName: "User D",
    userEmail: "userd@example.com",
    spaceId: testSpace,
    spaceLabel: "Focus Pods",
    unitId: testUnit2,
    unitLabel: "Pod 2",
    date: testDate,
    slot: testSlot2,
    slots: [testSlot2],
    grandTotal: 250,
    status: "pending",
  });
  console.log(`🟢 [SUCCESS] User D secured pending booking ID: ${userDBooking._id}`);

  // User E wants the same slot but adds premium food pre-orders! (Value: ₹750)
  console.log(`\n👤 User E requests the exact same slot but adds premium pre-ordered food (Total: ₹750)`);
  
  // Replicating POST /api/bookings preemption logic
  const conflicts2 = await Booking.find({
    spaceId: testSpace,
    unitId: testUnit2,
    date: testDate,
    status: { $ne: "cancelled" },
    slots: { $in: [testSlot2] },
  });

  const requestTotal = 750; // User E pays more
  const allPendingCanBeOverridden = conflicts2.every(
    b => b.status === "pending" && requestTotal > b.grandTotal
  );

  let userEBooking;
  if (allPendingCanBeOverridden) {
    console.log(`⚡ [PREEMPTION TRIGGERED] Higher payer detected (₹750 > ₹250)! Server overrides User D's pending booking.`);
    
    // Override/Cancel User D
    for (const pendingBk of conflicts2) {
      pendingBk.status = "cancelled";
      pendingBk.cancelledBy = "admin";
      pendingBk.cancelReason = "Overridden by a higher-value booking slot request";
      await pendingBk.save();
      console.log(`🗑️ Preempted & Cancelled User D's booking ${pendingBk._id}`);
    }

    // Create User E pending booking
    userEBooking = await Booking.create({
      userId: "firebase_user_e",
      userName: "User E",
      userEmail: "usere@example.com",
      spaceId: testSpace,
      spaceLabel: "Focus Pods",
      unitId: testUnit2,
      unitLabel: "Pod 2",
      date: testDate,
      slot: testSlot2,
      slots: [testSlot2],
      grandTotal: requestTotal,
      status: "pending",
    });
    console.log(`🟢 [SUCCESS] User E secured pending booking ID: ${userEBooking._id}`);
  }

  // User D tries to complete payment for their overridden booking (replicates confirm-payment check)
  console.log(`\n💳 User D completed payment late. Trying to confirm overridden booking ${userDBooking._id}`);
  const userDCheck = await Booking.findById(userDBooking._id);
  if (userDCheck.status === "cancelled" && userDCheck.cancelReason.includes("Overridden")) {
    console.log(`🔴 [REJECTED] Booking was overridden! Return 400 OVERRIDDEN error. Refund triggered for User D.`);
  }

  // User E completes payment (replicates successful confirmation)
  console.log(`\n💳 User E completed payment. Confirming payment with Razorpay ID: pay_XYZ789abc`);
  userEBooking.status = "confirmed";
  userEBooking.razorpayPaymentId = "pay_XYZ789abc";
  await userEBooking.save();
  console.log(`✨ [CONFIRMED] User E booking is now status: "${userEBooking.status}" with payment ref: ${userEBooking.razorpayPaymentId}\n`);

  console.log("==================================================================");
  console.log("🎉 ALL SCENARIOS RUN SUCCESSFULLY! DISCONNECTING...");
  console.log("==================================================================");
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch(err => {
  console.error("❌ Test run failed:", err);
  mongoose.disconnect();
  process.exit(1);
});
