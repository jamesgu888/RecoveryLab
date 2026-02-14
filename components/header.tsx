"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Logo from "@/components/logo";
import CTAButton from "@/components/ui/button-cta";
import { Menu, X } from "lucide-react";

const headerNavLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

interface HeaderProps {
  solid?: boolean;
}

export default function Header({ solid = false }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const lastY = useRef(0);

  const closeMobileMenu = () => setIsMenuOpen(false);

  const handleScroll = useCallback(() => {
    const winY = window.scrollY;
    const docY = document.documentElement.scrollTop;
    const bodyY = document.body.scrollTop;
    const currentY = winY || docY || bodyY || 0;
    setAtTop(currentY <= 5);
    if (currentY > lastY.current && currentY > 80) {
      setHidden(true);
      setIsMenuOpen(false);
    } else if (currentY < lastY.current) {
      setHidden(false);
    }
    lastY.current = currentY;
  }, [hidden]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div className="h-[72px] w-full sm:h-[88px]">
      <header
        style={{
          transform: hidden ? "translateY(-100%)" : "translateY(0)",
          transition: "transform 0.4s cubic-bezier(0.64, -0.01, 0, 1)",
        }}
        className="fixed top-0 left-0 z-50 flex h-[72px] w-full items-center justify-center sm:h-[88px]"
      >
        <div className="relative z-10 w-full px-5 sm:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <Link
                  href="/"
                  className="flex items-center gap-1.5"
                  aria-label="GaitGuard home"
                  onClick={closeMobileMenu}
                >
                  <Logo />
                </Link>

                <nav
                  className="hidden items-center gap-5 md:flex"
                  aria-label="Primary"
                >
                  {headerNavLinks.map((item) => (
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
              <div className="flex items-center gap-4">
                <div className="hidden items-center gap-4 md:flex">
                  <Link
                    href="/signin"
                    className="bg-[linear-gradient(0deg,#202020_0%,#515151_100%)] bg-clip-text text-base leading-[140%] font-bold [-webkit-background-clip:text] [-webkit-text-fill-color:transparent]"
                  >
                    Sign in
                  </Link>
                  <Link href="/signup">
                    <CTAButton variant="primary" size="sm">
                      <span>Get Started</span>
                    </CTAButton>
                  </Link>
                </div>
                <div className="flex gap-2 md:hidden">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="shrink-0 rounded-lg transition-colors hover:bg-gray-100"
                    aria-label="Toggle mobile menu"
                  >
                    {isMenuOpen ? (
                      <X className="h-6 w-6 text-gray-700" />
                    ) : (
                      <Menu className="h-6 w-6 text-gray-700" />
                    )}
                  </button>
                  <Link href="/signup">
                    <CTAButton size="sm" variant="secondary">
                      Sign In
                    </CTAButton>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className="absolute inset-0 z-0"
          style={{
            background: "linear-gradient(180deg, #EBF6FF 0%, #F6FBFF 50%, #FFFFFF 100%)",
            boxShadow: atTop
              ? "none"
              : "0 1px 6px rgba(0,0,0,0.08), 0 6px 20px rgba(1,65,99,0.07)",
            transition: "box-shadow 0.3s ease",
          }}
        />
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed top-0 right-0 bottom-0 left-0 z-40 border-b border-gray-200 bg-white shadow-lg">
          <div className="h-full px-5 py-6 pt-16 sm:px-8">
            <div className="mx-auto flex h-full max-w-[1200px] flex-col justify-between">
              <nav className="flex flex-col">
                {headerNavLinks.map((item, index) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`py-[18px] text-base leading-[140%] font-bold tracking-[-0.157px] text-[#202020] ${
                      index < headerNavLinks.length - 1
                        ? "border-b border-[rgba(0,0,0,0.10)]"
                        : ""
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="flex flex-col gap-2.5">
                <Link href="/signin">
                  <CTAButton variant="secondary" size="lg" className="w-full">
                    Sign In
                  </CTAButton>
                </Link>
                <Link href="/signup">
                  <CTAButton variant="primary" size="lg" className="w-full">
                    Get Started
                  </CTAButton>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
