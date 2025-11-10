/** @format */

import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ locale }) => {
  // Default to 'en' if locale is undefined or invalid
  const validatedLocale =
    locale && ["en", "vi"].includes(locale) ? locale : "en";

  return {
    locale: validatedLocale,
    messages: (await import(`../../messages/${validatedLocale}.json`)).default,
  };
});
