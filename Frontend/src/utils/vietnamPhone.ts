export const normalizeVietnamPhone = (phone: string) => {
  const compactPhone = phone.trim().replace(/[\s.-]/g, "");

  if (compactPhone.startsWith("+84")) {
    return `0${compactPhone.slice(3)}`;
  }

  if (compactPhone.startsWith("84") && compactPhone.length === 11) {
    return `0${compactPhone.slice(2)}`;
  }

  return compactPhone;
};

export const isValidVietnamMobilePhone = (phone: string) =>
  /^(03|05|07|08|09)\d{8}$/.test(normalizeVietnamPhone(phone));
