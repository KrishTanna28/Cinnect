/**
 * Client-safe utility to check if a user is 18+ based on their date of birth.
 * @param {string|Date|null} dateOfBirth
 * @returns {boolean} true if user is 18 or older
 */
export function isUserAdult(dateOfBirth) {
  if (!dateOfBirth) return false
  const dob = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age >= 18
}

/**
 * Check if adult content should be filtered out for the current user.
 * @param {object|null} user - User object from context
 * @returns {boolean} true if adult content should be hidden entirely (user is under 18)
 */
export function shouldFilterAdultContent(user) {
  if (!user) return false // Guest users see blurred content
  if (!user.dateOfBirth) return false // No DOB set, show blurred
  return !isUserAdult(user.dateOfBirth)
}
