import * as React from "react";
import Link from "next/link";
import Logo from "./logo";

const footerMenuLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

const footerLegalLinks = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
];

function Footer() {
  return (
    <footer className="relative -z-10 mt-auto">
      <div className="px-5 sm:px-8">
        <div className="relative mx-auto max-w-[1200px] py-12 pb-24">
          <div className="flex flex-col gap-10 sm:items-center sm:justify-between md:flex-row">
            {/* Logo and Copyright Section */}
            <div className="flex flex-col gap-6">
              <Logo className="w-full sm:w-[456px] md:w-[256px]" />
              <p className="hidden text-center text-base leading-[140%] text-[rgba(32,32,32,0.75)] sm:block">
                &copy; 2025 GaitGuard. All rights reserved.
              </p>
            </div>

            {/* Navigation Columns */}
            <div className="flex w-full flex-row justify-between gap-10 sm:w-auto sm:justify-normal sm:text-center md:text-left lg:gap-10 xl:gap-12">
              {/* Menu Column */}
              <div className="flex w-[50%] flex-col gap-3 md:w-auto">
                <h3 className="text-xl leading-[1.15] font-bold tracking-[-0.01rem] text-[#202020]">
                  Menu
                </h3>
                <nav className="flex flex-col gap-2" aria-label="Footer menu">
                  {footerMenuLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-base leading-[140%] text-[rgba(32,32,32,0.75)] transition-colors hover:text-[#202020]"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Legal Column */}
              <div className="flex w-[50%] flex-col gap-3 md:w-auto">
                <h3 className="text-xl leading-[1.15] font-bold tracking-[-0.01rem] text-[#202020]">
                  Legal
                </h3>
                <nav className="flex flex-col gap-2" aria-label="Legal">
                  {footerLegalLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-base leading-[140%] text-[rgba(32,32,32,0.75)] transition-colors hover:text-[#202020]"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            <p className="text-base leading-[140%] text-[rgba(32,32,32,0.75)] sm:hidden">
              &copy; 2025 GaitGuard. All rights reserved.
            </p>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 -z-20 h-[969px] w-full bg-[linear-gradient(0deg,#E0F5FF_0%,#F0FAFF_44.95%,#FFFFFF_100%)]"></div>
    </footer>
  );
}

export default Footer;
