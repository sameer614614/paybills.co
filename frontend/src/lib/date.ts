export function isAdult(dateString: string, minimumAge = 18) {
  const dob = new Date(dateString)
  if (Number.isNaN(dob.getTime())) {
    return false
  }
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate())

  if (!hasHadBirthdayThisYear) {
    age -= 1
  }

  return age >= minimumAge
}
