import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden px-5 pt-10 sm:px-8">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-8 lg:grid-cols-2">
            {/* Left — text content */}
            <div className="text-center lg:text-left">
              <div className="fade-in">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm text-[rgba(32,32,32,0.75)] shadow-[0px_2px_4px_-1px_rgba(1,65,99,0.08)] border border-[rgba(32,32,32,0.08)]">
                  <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-r from-[#1DB3FB] to-[#00A7EF]" />
                  Gait Analysis Platform
                </div>
              </div>

              <h1
                className="fade-in max-w-3xl text-[32px] leading-[96%] font-bold tracking-[-0.05em] sm:text-[48px] md:text-[64px]"
                style={{ animationDelay: "0.1s" }}
              >
                Understand movement.{" "}
                <span className="text-gradient">Protect health.</span>
              </h1>

              <p
                className="fade-in mt-6 max-w-xl text-base leading-[140%] text-[rgba(32,32,32,0.75)] sm:text-lg"
                style={{ animationDelay: "0.2s" }}
              >
                Upload a walking video and get AI-powered gait analysis with
                personalized exercise recommendations in seconds.
              </p>

              <div
                className="fade-in mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
                style={{ animationDelay: "0.3s" }}
              >
                <Link href="/analyze">
                  <Button variant="modern-primary" size="modern-xl" className="gap-2 px-6">
                    Analyze Your Gait
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button variant="modern-outline" size="modern-xl" className="px-6">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right — illustration */}
            <div
              className="fade-in flex items-center justify-center lg:justify-end"
              style={{ animationDelay: "0.3s" }}
            >
              <svg viewBox="0 0 204 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                <g clipPath="url(#clip0_hero)">
                  <path d="M100.338 64.9272C108.912 60.7195 124.134 55.2534 132.376 52.2254L132.722 53.1643C124.449 56.2036 109.292 61.6465 100.779 65.8249C75.2592 78.3494 54.1004 93.6001 40.5172 108.115C33.7246 115.373 28.8453 122.428 26.2526 128.846C23.6597 135.265 23.3731 140.993 25.6656 145.664L24.7679 146.104C22.306 141.088 22.6698 135.044 25.3246 128.471C27.9797 121.899 32.9456 114.741 39.7868 107.431C53.472 92.8074 74.7386 77.491 100.338 64.9272Z" fill="#76CFFA"/>
                  <rect x="73.178" y="46.6656" width="42.9314" height="42.9314" rx="7" transform="rotate(-11.4039 73.178 46.6656)" fill="#FB4137"/>
                  <rect x="73.178" y="46.6656" width="42.9314" height="42.9314" rx="7" transform="rotate(-11.4039 73.178 46.6656)" fill="url(#hero_r0)" fillOpacity="0.5"/>
                  <rect x="73.178" y="46.6656" width="42.9314" height="42.9314" rx="7" transform="rotate(-11.4039 73.178 46.6656)" stroke="white" strokeWidth="2"/>
                  <path d="M80.0398 45.282L108.4 39.5615C112.19 38.7973 115.882 41.2497 116.646 45.0392L122.367 73.3997C123.131 77.1892 120.678 80.8811 116.889 81.6456L88.5284 87.3661C84.7388 88.1305 81.0471 85.6779 80.2825 81.8883L74.5621 53.5279C73.7977 49.7382 76.2501 46.0464 80.0398 45.282Z" fill="#FB4137"/>
                  <path d="M80.0398 45.282L108.4 39.5615C112.19 38.7973 115.882 41.2497 116.646 45.0392L122.367 73.3997C123.131 77.1892 120.678 80.8811 116.889 81.6456L88.5284 87.3661C84.7388 88.1305 81.0471 85.6779 80.2825 81.8883L74.5621 53.5279C73.7977 49.7382 76.2501 46.0464 80.0398 45.282Z" fill="url(#hero_r1)" fillOpacity="0.5"/>
                  <path d="M80.0398 45.282L108.4 39.5615C112.19 38.7973 115.882 41.2497 116.646 45.0392L122.367 73.3997C123.131 77.1892 120.678 80.8811 116.889 81.6456L88.5284 87.3661C84.7388 88.1305 81.0471 85.6779 80.2825 81.8883L74.5621 53.5279C73.7977 49.7382 76.2501 46.0464 80.0398 45.282Z" stroke="white" strokeWidth="2"/>
                  <path d="M114.012 66.0627C108.403 76.2658 94.3645 79.1273 85.4434 72.2666" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <rect x="90.7012" y="61.4963" width="4.53297" height="7.7598" rx="2.26648" transform="rotate(-11.4039 90.7012 61.4963)" fill="white"/>
                  <rect x="101.494" y="59.3191" width="4.53297" height="7.7598" rx="2.26648" transform="rotate(-11.4039 101.494 59.3191)" fill="white"/>
                  <circle cx="65.122" cy="102.122" r="27.0869" transform="rotate(-10.7421 65.122 102.122)" fill="#FFD000"/>
                  <circle cx="65.122" cy="102.122" r="27.0869" transform="rotate(-10.7421 65.122 102.122)" fill="url(#hero_r2)" fillOpacity="0.6"/>
                  <circle cx="65.122" cy="102.122" r="27.0869" transform="rotate(-10.7421 65.122 102.122)" stroke="white" strokeWidth="2.5"/>
                  <path d="M56.5026 111.031C67.5875 117.822 82.8673 112.481 87.8066 100.537" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <rect width="5.87634" height="10.0598" rx="2.93817" transform="matrix(-0.948141 0.31785 0.31785 0.948141 76.9688 87.5347)" fill="white"/>
                  <rect width="5.87634" height="10.0598" rx="2.93817" transform="matrix(-0.948141 0.31785 0.31785 0.948141 63.4375 92.0713)" fill="white"/>
                  <path d="M140.623 86.8894C148.574 82.4233 158.115 89.2955 156.399 98.2519C155.538 102.743 157.059 107.36 160.421 110.459C167.126 116.641 163.538 127.84 154.489 128.975C149.952 129.544 146.031 132.417 144.122 136.572C140.314 144.859 128.556 144.908 124.68 136.653C122.737 132.513 118.792 129.672 114.251 129.14C105.193 128.08 101.513 116.912 108.167 110.675C111.503 107.548 112.986 102.919 112.088 98.4353C110.297 89.4928 119.782 82.5411 127.77 86.9422C131.775 89.1488 136.637 89.129 140.623 86.8894Z" fill="#FB1DA7"/>
                  <path d="M140.623 86.8894C148.574 82.4233 158.115 89.2955 156.399 98.2519C155.538 102.743 157.059 107.36 160.421 110.459C167.126 116.641 163.538 127.84 154.489 128.975C149.952 129.544 146.031 132.417 144.122 136.572C140.314 144.859 128.556 144.908 124.68 136.653C122.737 132.513 118.792 129.672 114.251 129.14C105.193 128.08 101.513 116.912 108.167 110.675C111.503 107.548 112.986 102.919 112.088 98.4353C110.297 89.4928 119.782 82.5411 127.77 86.9422C131.775 89.1488 136.637 89.129 140.623 86.8894Z" fill="url(#hero_r3)" fillOpacity="0.5"/>
                  <path d="M140.623 86.8894C148.574 82.4233 158.115 89.2955 156.399 98.2519C155.538 102.743 157.059 107.36 160.421 110.459C167.126 116.641 163.538 127.84 154.489 128.975C149.952 129.544 146.031 132.417 144.122 136.572C140.314 144.859 128.556 144.908 124.68 136.653C122.737 132.513 118.792 129.672 114.251 129.14C105.193 128.08 101.513 116.912 108.167 110.675C111.503 107.548 112.986 102.919 112.088 98.4353C110.297 89.4928 119.782 82.5411 127.77 86.9422C131.775 89.1488 136.637 89.129 140.623 86.8894Z" stroke="white" strokeWidth="2.5"/>
                  <path d="M146.366 123.803C134.194 126.523 121.195 116.603 119.619 103.896" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <rect x="132.094" y="100.023" width="5.12722" height="8.77351" rx="2.56361" transform="rotate(35.764 132.094 100.023)" fill="white"/>
                  <rect x="142.195" y="107.301" width="5.12722" height="8.77351" rx="2.56361" transform="rotate(35.764 142.195 107.301)" fill="white"/>
                  <path d="M25.6672 145.663C27.9598 150.335 32.6658 153.612 39.3297 155.488C45.9932 157.364 54.5586 157.821 64.4561 156.888C84.2474 155.023 109.255 147.615 134.775 135.09C150.21 127.515 164.053 118.942 175.59 110.134L175.893 110.532L176.197 110.929C164.604 119.779 150.704 128.387 135.215 135.988C109.616 148.552 84.4896 156.004 64.5496 157.883C54.5816 158.822 45.882 158.372 39.0583 156.451C32.235 154.53 27.2315 151.12 24.7695 146.104L25.6672 145.663Z" fill="#76CFFA"/>
                  <path d="M188.144 30.1263C189.144 30.3214 189.911 30.9329 190.352 31.7095C190.376 31.7522 190.401 31.7986 190.42 31.8352C191.039 33.0471 190.899 34.6649 189.706 35.7419L147.409 73.9394C145.612 75.5626 142.734 74.7269 142.085 72.3943L137.448 55.7375C137.319 55.2748 136.804 55.0536 136.388 55.2664C135.877 55.5271 135.368 55.7892 134.859 56.0526L133.334 56.8469C129.56 58.8244 125.141 55.0495 126.929 50.989C128.716 46.93 130.591 42.8913 132.553 38.875C132.636 38.7061 132.653 38.5138 132.603 38.3352L128.412 23.2806C127.762 20.9462 129.797 18.7467 132.174 19.2101L188.144 30.1263Z" fill="#1DB3FB"/>
                  <path d="M188.144 30.1263C189.144 30.3214 189.911 30.9329 190.352 31.7095C190.376 31.7522 190.401 31.7986 190.42 31.8352C191.039 33.0471 190.899 34.6649 189.706 35.7419L147.409 73.9394C145.612 75.5626 142.734 74.7269 142.085 72.3943L137.448 55.7375C137.319 55.2748 136.804 55.0536 136.388 55.2664C135.877 55.5271 135.368 55.7892 134.859 56.0526L133.334 56.8469C129.56 58.8244 125.141 55.0495 126.929 50.989C128.716 46.93 130.591 42.8913 132.553 38.875C132.636 38.7061 132.653 38.5138 132.603 38.3352L128.412 23.2806C127.762 20.9462 129.797 18.7467 132.174 19.2101L188.144 30.1263Z" fill="url(#hero_l5)"/>
                  <path d="M188.144 30.1263C189.144 30.3214 189.911 30.9329 190.352 31.7095C190.376 31.7522 190.401 31.7986 190.42 31.8352C191.039 33.0471 190.899 34.6649 189.706 35.7419L147.409 73.9394C145.612 75.5626 142.734 74.7269 142.085 72.3943L137.448 55.7375C137.319 55.2748 136.804 55.0536 136.388 55.2664C135.877 55.5271 135.368 55.7892 134.859 56.0526L133.334 56.8469C129.56 58.8244 125.141 55.0495 126.929 50.989C128.716 46.93 130.591 42.8913 132.553 38.875C132.636 38.7061 132.653 38.5138 132.603 38.3352L128.412 23.2806C127.762 20.9462 129.797 18.7467 132.174 19.2101L188.144 30.1263Z" stroke="white" strokeWidth="2.5"/>
                  <mask id="hero_mask0" style={{maskType: "alpha"}} maskUnits="userSpaceOnUse" x="127" y="20" width="63" height="54">
                    <path d="M187.903 31.3538C188.526 31.4751 188.993 31.8486 189.263 32.3254C189.279 32.3528 189.295 32.3835 189.305 32.4034C189.693 33.1621 189.598 34.1519 188.866 34.8129L146.566 73.0018C145.458 74.0019 143.684 73.4874 143.284 72.05L138.65 55.4006C138.311 54.1828 136.943 53.577 135.817 54.1524C134.793 54.6757 133.771 55.2044 132.752 55.7385C129.947 57.2082 126.795 54.3907 128.072 51.4943C129.853 47.4515 131.721 43.429 133.677 39.4288C133.893 38.9864 133.94 38.4803 133.808 38.0059L129.62 22.9574C129.22 21.52 130.474 20.1647 131.939 20.4502L187.903 31.3538Z" fill="#1DB3FB"/>
                    <path d="M187.903 31.3538C188.526 31.4751 188.993 31.8486 189.263 32.3254C189.279 32.3528 189.295 32.3835 189.305 32.4034C189.693 33.1621 189.598 34.1519 188.866 34.8129L146.566 73.0018C145.458 74.0019 143.684 73.4874 143.284 72.05L138.65 55.4006C138.311 54.1828 136.943 53.577 135.817 54.1524C134.793 54.6757 133.771 55.2044 132.752 55.7385C129.947 57.2082 126.795 54.3907 128.072 51.4943C129.853 47.4515 131.721 43.429 133.677 39.4288C133.893 38.9864 133.94 38.4803 133.808 38.0059L129.62 22.9574C129.22 21.52 130.474 20.1647 131.939 20.4502L187.903 31.3538Z" fill="url(#hero_l6)"/>
                  </mask>
                  <g mask="url(#hero_mask0)">
                    <ellipse opacity="0.1" cx="334.241" cy="334.162" rx="334.241" ry="334.162" transform="matrix(0.870801 0.491637 -0.49211 0.870533 20.8379 -92.1909)" fill="#F2FAFF"/>
                    <ellipse opacity="0.1" cx="334.241" cy="334.162" rx="334.241" ry="334.162" transform="matrix(0.870801 0.491637 -0.49211 0.870533 222.791 -130.409)" fill="#FFF4BD"/>
                  </g>
                  <path d="M188.104 32.4215C188.298 32.4159 188.343 32.6896 188.158 32.7476C168.999 38.7353 150.577 46.3915 132.776 55.7356C129.972 57.2075 126.805 54.3833 128.07 51.4808C129.858 47.3761 131.718 43.3446 133.834 39.0575C151.638 35.6384 169.88 32.9478 188.104 32.4215Z" fill="url(#hero_l7)"/>
                  <path d="M188.104 32.4215C188.298 32.4159 188.343 32.6896 188.158 32.7476C168.999 38.7353 150.577 46.3915 132.776 55.7356C129.972 57.2075 126.805 54.3833 128.07 51.4808C129.858 47.3761 131.718 43.3446 133.834 39.0575C151.638 35.6384 169.88 32.9478 188.104 32.4215Z" fill="url(#hero_l8)" fillOpacity="0.55"/>
                  <circle cx="111.74" cy="24.922" r="2.51969" transform="rotate(25.6441 111.74 24.922)" fill="white"/>
                  <circle cx="197.745" cy="45.2292" r="2.51969" transform="rotate(25.6441 197.745 45.2292)" fill="white"/>
                  <circle cx="191.626" cy="65.6832" r="0.839895" transform="rotate(25.6441 191.626 65.6832)" fill="white"/>
                  <circle cx="107.203" cy="13.5086" r="0.419947" transform="rotate(25.6441 107.203 13.5086)" fill="#57C6FC"/>
                  <circle cx="185.948" cy="14.3189" r="0.839895" transform="rotate(25.6441 185.948 14.3189)" fill="white"/>
                </g>
                <defs>
                  <radialGradient id="hero_r0" cx="0" cy="0" r="1" gradientTransform="matrix(-30.9364 34.9875 -80.8406 -42.1312 114.353 45.8831)" gradientUnits="userSpaceOnUse">
                    <stop offset="0.121436" stopColor="#FFC500"/><stop offset="1" stopColor="#FFC500" stopOpacity="0"/>
                  </radialGradient>
                  <radialGradient id="hero_r1" cx="0" cy="0" r="1" gradientTransform="matrix(-23.4077 40.4137 -87.575 -25.3153 113.517 37.5093)" gradientUnits="userSpaceOnUse">
                    <stop offset="0.121436" stopColor="#FFC500"/><stop offset="1" stopColor="#FFC500" stopOpacity="0"/>
                  </radialGradient>
                  <radialGradient id="hero_r2" cx="0" cy="0" r="1" gradientTransform="matrix(23.9724 -43.32 43.8013 23.8045 52.9527 123.593)" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FB811D"/><stop offset="1" stopColor="#FB811D" stopOpacity="0"/>
                  </radialGradient>
                  <radialGradient id="hero_r3" cx="0" cy="0" r="1" gradientTransform="matrix(-97.7558 22.1244 -87.931 -174.762 197.111 98.1224)" gradientUnits="userSpaceOnUse">
                    <stop offset="0.121436" stopColor="#FFC500"/><stop offset="1" stopColor="#FFC500" stopOpacity="0"/>
                  </radialGradient>
                  <linearGradient id="hero_l5" x1="187.204" y1="35.6329" x2="126.788" y2="54.514" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FFF4BD"/><stop offset="1" stopColor="#B6E8FF" stopOpacity="0"/>
                  </linearGradient>
                  <linearGradient id="hero_l6" x1="186.001" y1="30.4765" x2="126.791" y2="54.5139" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#B6E8FF"/><stop offset="1" stopColor="#B6E8FF" stopOpacity="0"/>
                  </linearGradient>
                  <linearGradient id="hero_l7" x1="185.056" y1="32.9243" x2="136.956" y2="55.1066" gradientUnits="userSpaceOnUse">
                    <stop offset="0.315506" stopColor="#84A1FF"/><stop offset="1" stopColor="#00A7EF"/>
                  </linearGradient>
                  <linearGradient id="hero_l8" x1="173.183" y1="27.6737" x2="172.204" y2="40.3315" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3A4EE2"/><stop offset="1" stopColor="#3A4EE2" stopOpacity="0"/>
                  </linearGradient>
                  <clipPath id="clip0_hero">
                    <path d="M0 24C0 16.5449 0 12.8174 1.21793 9.87706C2.84183 5.95662 5.95662 2.84183 9.87706 1.21793C12.8174 0 16.5449 0 24 0H180C187.455 0 191.183 0 194.123 1.21793C198.043 2.84183 201.158 5.95662 202.782 9.87706C204 12.8174 204 16.5449 204 24V156C204 163.455 204 167.183 202.782 170.123C201.158 174.043 198.043 177.158 194.123 178.782C191.183 180 187.455 180 180 180H24C16.5449 180 12.8174 180 9.87706 178.782C5.95662 177.158 2.84183 174.043 1.21793 170.123C0 167.183 0 163.455 0 156V24Z" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-14 text-center">
              <h2 className="h2-style text-[#202020]">
                Built for <span className="text-gradient">precision</span>
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base leading-[140%] text-[rgba(32,32,32,0.75)]">
                Everything you need to analyze, monitor, and improve gait
                patterns.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-6">
                <div className="mb-4 flex items-center gap-4">
                  <svg className="h-14 w-14 shrink-0" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#feat1_clip)">
                      <rect width="64" height="64" rx="8" fill="#E5F8E6"/>
                      <circle cx="-24" cy="-20" r="95" fill="#BFECC3"/>
                      <ellipse cx="-24.6094" cy="-20" rx="65.5" ry="65" fill="#0BBB46"/>
                      <ellipse cx="-24.6094" cy="-20" rx="65.5" ry="65" fill="url(#feat1_r0)" fillOpacity="0.55"/>
                      <path d="M6 58C6 43.6406 17.6406 32 32 32C46.3594 32 58 43.6406 58 58V84H6V58Z" fill="#81D48B"/>
                      <path d="M20 44.7588C20 46.4156 21.567 47.7588 23.5 47.7588C25.433 47.7588 27 46.4156 27 44.7588" stroke="#00395F" strokeWidth="2.5" strokeLinecap="round"/>
                      <path d="M36 44.7588C36 46.4156 37.567 47.7588 39.5 47.7588C41.433 47.7588 43 46.4156 43 44.7588" stroke="#00395F" strokeWidth="2.5" strokeLinecap="round"/>
                      <path d="M16 54.2585C22.7117 59.2046 41 59.4998 47 54.2585" stroke="#00395F" strokeWidth="2.5" strokeLinecap="round"/>
                      <path d="M41.5 3C47.8513 3 53 8.14873 53 14.5C53 19.9377 49.225 24.4903 44.1533 25.6885L34.2666 31.6367C33.4771 32.1116 32.5202 31.3569 32.7979 30.4785L34.2139 26H22.5C16.1487 26 11 20.8513 11 14.5C11 8.14873 16.1487 3 22.5 3H41.5Z" fill="white"/>
                      <circle cx="22" cy="15" r="3" fill="#0BBB46"/>
                      <circle cx="33" cy="15" r="3" fill="#0BBB46"/>
                      <circle cx="44" cy="15" r="3" fill="#0BBB46"/>
                    </g>
                    <rect x="0.5" y="0.5" width="63" height="63" rx="7.5" stroke="#202020" strokeOpacity="0.04"/>
                    <defs>
                      <radialGradient id="feat1_r0" cx="0" cy="0" r="1" gradientTransform="matrix(-37.9653 -81.382 48.0961 -41.6263 7.80286 40.6599)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#00AE3E"/><stop offset="1" stopColor="#00AE3E" stopOpacity="0"/>
                      </radialGradient>
                      <clipPath id="feat1_clip"><rect width="64" height="64" rx="8" fill="white"/></clipPath>
                    </defs>
                  </svg>
                  <h3 className="text-xl leading-[1.15] font-bold tracking-[-0.01rem] text-[#202020]">
                    AI-Powered Vision
                  </h3>
                </div>
                <p className="text-base leading-[140%] text-[rgba(32,32,32,0.75)]">
                  NVIDIA VLM analyzes your walking video frame by frame to identify gait patterns and abnormalities.
                </p>
              </div>

              <div className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-6">
                <div className="mb-4 flex items-center gap-4">
                  <svg className="h-14 w-14 shrink-0" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#feat3_clip)">
                      <rect width="64" height="64" rx="8" fill="#FFF4BD"/>
                      <circle cx="-25" cy="107" r="90" fill="#FFEB98"/>
                      <ellipse cx="-25.6094" cy="102" rx="65.5" ry="65" fill="#FFD000"/>
                      <ellipse cx="-25.6094" cy="102" rx="65.5" ry="65" fill="url(#feat3_l0)" fillOpacity="0.6"/>
                      <path d="M32 11V31.5" stroke="white" strokeWidth="2"/>
                      <path d="M12 31.5H52" stroke="white" strokeWidth="2"/>
                      <path d="M52 31V51.5H32V66" stroke="white" strokeWidth="2"/>
                      <circle cx="12" cy="31" r="5" fill="#FDA112"/>
                      <circle cx="32" cy="11" r="5" fill="#FDA112" stroke="#00395F" strokeWidth="2.5" strokeLinecap="round"/>
                      <circle cx="32" cy="31" r="5" fill="#FDA112"/>
                      <circle cx="52" cy="31" r="5" fill="#FDA112"/>
                      <circle cx="52" cy="51" r="5" fill="#FDA112"/>
                      <circle cx="32" cy="51" r="5" fill="#FDA112" stroke="#00395F" strokeWidth="2.5" strokeLinecap="round"/>
                    </g>
                    <rect x="0.5" y="0.5" width="63" height="63" rx="7.5" stroke="#202020" strokeOpacity="0.04"/>
                    <defs>
                      <linearGradient id="feat3_l0" x1="2" y1="41.5" x2="34" y2="77" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FB811D"/><stop offset="1" stopColor="#FB811D" stopOpacity="0"/>
                      </linearGradient>
                      <clipPath id="feat3_clip"><rect width="64" height="64" rx="8" fill="white"/></clipPath>
                    </defs>
                  </svg>
                  <h3 className="text-xl leading-[1.15] font-bold tracking-[-0.01rem] text-[#202020]">
                    Detailed Breakdown
                  </h3>
                </div>
                <p className="text-base leading-[140%] text-[rgba(32,32,32,0.75)]">
                  See left vs right side comparisons, asymmetry detection, and severity scoring.
                </p>
              </div>

              <div className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-6">
                <div className="mb-4 flex items-center gap-4">
                  <svg className="h-14 w-14 shrink-0" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#feat2_clip)">
                      <rect width="64" height="64" rx="8" fill="#ECF2FF"/>
                      <circle cx="-5" cy="106" r="95" fill="#CEDEFF"/>
                      <ellipse cx="-5.60938" cy="106" rx="65.5" ry="65" fill="#84A1FF"/>
                      <ellipse cx="-5.60938" cy="106" rx="65.5" ry="65" fill="url(#feat2_l0)" fillOpacity="0.55"/>
                      <path d="M5.81142 20C0.794922 27.5 6.43393 43.0611 19.8113 34.5C32.3118 26.5 20.8113 18 15.8117 27.5C12.7036 33.4059 11.8118 45.5 27.3118 49" stroke="#00395F" strokeWidth="2.5" strokeLinecap="round"/>
                      <path d="M48.4764 8.84643C50.43 6.16982 54.1835 5.58368 56.8601 7.53724C59.5367 9.49081 60.1229 13.2443 58.1693 15.9209L38.1249 43.384L28.4321 36.3096L48.4764 8.84643Z" fill="#4258FF"/>
                      <rect x="46.709" y="11.2695" width="12" height="3" transform="rotate(36.1244 46.709 11.2695)" fill="#ECF2FF"/>
                      <path d="M27.8438 37.1172L37.5366 44.1917L28.0839 50.1154C26.554 51.0741 24.6374 49.6752 25.084 47.9259L27.8438 37.1172Z" fill="white"/>
                    </g>
                    <rect x="0.5" y="0.5" width="63" height="63" rx="7.5" stroke="#202020" strokeOpacity="0.04"/>
                    <defs>
                      <linearGradient id="feat2_l0" x1="1.00001" y1="45.5" x2="30.5" y2="55.5" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#3A4EE2"/><stop offset="1" stopColor="#3A4EE2" stopOpacity="0"/>
                      </linearGradient>
                      <clipPath id="feat2_clip"><rect width="64" height="64" rx="8" fill="white"/></clipPath>
                    </defs>
                  </svg>
                  <h3 className="text-xl leading-[1.15] font-bold tracking-[-0.01rem] text-[#202020]">
                    Iterative Refinement
                  </h3>
                </div>
                <p className="text-base leading-[140%] text-[rgba(32,32,32,0.75)]">
                  Your feedback sharpens every analysis. The AI learns from your input to deliver increasingly accurate results over time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-14 text-center">
              <h2 className="h2-style text-[#202020]">
                How it <span className="text-gradient">works</span>
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base leading-[140%] text-[rgba(32,32,32,0.75)]">
                Three simple steps to get started with GaitGuard.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Upload",
                  description: "Record or upload a video of yourself walking. Our system accepts webcam recordings or file uploads.",
                },
                {
                  step: "02",
                  title: "AI Analysis",
                  description: "NVIDIA's vision AI analyzes your gait patterns, detecting asymmetries, postural issues, and movement abnormalities.",
                },
                {
                  step: "03",
                  title: "Get Your Plan",
                  description: "Receive a personalized exercise program with step-by-step instructions tailored to your specific gait patterns.",
                },
              ].map((item) => (
                <div key={item.step} className="platform-feature-card rounded-[10px] border border-[rgba(32,32,32,0.06)] p-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-[1.054px] border-[#202020] bg-gradient-to-b from-[#515151] to-[#202020] shadow-[0_0_1.054px_3.163px_#494949_inset,0_6.325px_5.271px_0_rgba(0,0,0,0.55)_inset]">
                    <span className="text-sm font-bold text-white">{item.step}</span>
                  </div>
                  <h3 className="mb-2 text-xl leading-[1.15] font-bold tracking-[-0.01rem] text-[#202020]">
                    {item.title}
                  </h3>
                  <p className="text-base leading-[140%] text-[rgba(32,32,32,0.75)]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-[800px]">
            <div className="rounded-[16px] bg-[linear-gradient(180deg,#E0F5FF_0%,#F0FAFF_44.95%,#FFFFFF_100%)] border border-[rgba(32,32,32,0.06)] p-10 text-center sm:p-16">
              <h2 className="h2-style text-[#202020]">
                Ready to improve your <span className="text-gradient">movement</span>?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-base leading-[140%] text-[rgba(32,32,32,0.75)]">
                Join GaitGuard today and take the first step towards better gait
                health.
              </p>
              <div className="mt-8 flex justify-center">
                <Link href="/analyze">
                  <Button variant="modern-primary" size="modern-xl" className="gap-2 px-6">
                    Start Free Analysis
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
