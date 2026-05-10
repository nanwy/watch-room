export function isAdminRequest(request: Request) {
  const expectedPasscode = process.env.ADMIN_PASSCODE
  if (!expectedPasscode) return false

  const providedPasscode = request.headers.get("x-admin-passcode")
  return providedPasscode === expectedPasscode
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
