function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;

  const visibleStart = localPart.slice(0, Math.min(2, localPart.length));
  const visibleEnd = localPart.length > 3 ? localPart.slice(-1) : "";

  return `${visibleStart}***${visibleEnd}@${domain}`;
}

export { maskEmail };
