import WebsiteFooter from "~/components/website/WebsiteFooter";

/**
 * The app's footer is the website footer, so signed-in and signed-out pages
 * always match. `dark` is kept so existing callers don't change; the footer
 * has one look everywhere.
 */
const Footer = (_props: { dark?: boolean } = {}) => (
  <WebsiteFooter className="mt-16" />
);

export default Footer;
