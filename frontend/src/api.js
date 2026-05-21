// API_BASE_URL - Update this to match your backend
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Helper: Get Firebase token from user
export const getAuthToken = async (user) => {
  if (!user) return null;
  return await user.getIdToken();
};

// BOOKINGS API

export const createBooking = async (user, bookingData) => {
  const token = await getAuthToken(user);
  
  const response = await fetch(`${API_BASE_URL}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(bookingData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create booking");
  }

  return await response.json();
};

export const getBookings = async (user) => {
  const token = await getAuthToken(user);
  
  const response = await fetch(`${API_BASE_URL}/bookings`, {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch bookings");
  }

  return await response.json();
};

export const getBookingById = async (user, bookingId) => {
  const token = await getAuthToken(user);
  
  const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch booking");
  }

  return await response.json();
};

export const cancelBooking = async (user, bookingId) => {
  const token = await getAuthToken(user);
  
  const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to cancel booking");
  }

  return await response.json();
};

export const checkSlotAvailability = async (date, unitId, slot) => {
  const response = await fetch(
    `${API_BASE_URL}/bookings/check-availability/${date}/${unitId}/${slot}`
  );

  if (!response.ok) {
    throw new Error("Failed to check availability");
  }

  const data = await response.json();
  return data.available;
};