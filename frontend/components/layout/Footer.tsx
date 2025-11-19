'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { name: 'Features', href: '/#features' },
      { name: 'Pricing', href: '/pricing' },
      { name: 'Jobs', href: '/jobs' },
      { name: 'Dashboard', href: '/dashboard' },
    ],
    company: [
      { name: 'About', href: '/about' },
      { name: 'Blog', href: '/blog' },
      { name: 'Careers', href: '/careers' },
      { name: 'Contact', href: '/contact' },
    ],
    legal: [
      { name: 'Privacy', href: '/privacy' },
      { name: 'Terms', href: '/terms' },
      { name: 'Cookie Policy', href: '/cookies' },
      { name: 'Security', href: '/security' },
    ],
    resources: [
      { name: 'Documentation', href: '/docs' },
      { name: 'API', href: '/api' },
      { name: 'Support', href: '/support' },
      { name: 'Community', href: '/community' },
    ],
  };

  return (
    <footer className="relative border-t border-gray-800 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-50" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-12 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Link href="/" className="flex items-center gap-3 mb-4 group">
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 bg-gradient-to-br from-teal-400 to-purple-600 rounded-lg flex items-center justify-center"
                  style={{
                    boxShadow: '0 0 20px rgba(20, 184, 166, 0.5)',
                  }}
                >
                  <span className="text-xl font-bold text-white">T</span>
                </motion.div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-purple-600 bg-clip-text text-transparent">
                  HR PLATFORM
                </h2>
              </Link>
              <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-xs">
                Connect talent with opportunity. The intelligent, location-based platform for modern recruitment and career growth.
              </p>
              <div className="flex items-center gap-4">
                {[
                  { name: 'Twitter', icon: '𝕏', href: '#' },
                  { name: 'LinkedIn', icon: 'in', href: '#' },
                  { name: 'GitHub', icon: '⚡', href: '#' },
                ].map((social, index) => (
                  <motion.a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-semibold transition-all duration-300"
                    style={{
                      background: 'oklch(0.1 0 0 / 0.6)',
                      border: '1px solid oklch(0.17 0 0 / 0.8)',
                    }}
                  >
                    {social.icon}
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Product Links */}
          <div>
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-white font-semibold mb-4 text-sm uppercase tracking-wider"
            >
              Product
            </motion.h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link, index) => (
                <motion.li
                  key={link.name}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-300 inline-block group"
                  >
                    <span className="group-hover:translate-x-1 inline-block transition-transform duration-300">
                      {link.name}
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-white font-semibold mb-4 text-sm uppercase tracking-wider"
            >
              Company
            </motion.h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link, index) => (
                <motion.li
                  key={link.name}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-300 inline-block group"
                  >
                    <span className="group-hover:translate-x-1 inline-block transition-transform duration-300">
                      {link.name}
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-white font-semibold mb-4 text-sm uppercase tracking-wider"
            >
              Resources
            </motion.h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link, index) => (
                <motion.li
                  key={link.name}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-300 inline-block group"
                  >
                    <span className="group-hover:translate-x-1 inline-block transition-transform duration-300">
                      {link.name}
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-white font-semibold mb-4 text-sm uppercase tracking-wider"
            >
              Legal
            </motion.h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link, index) => (
                <motion.li
                  key={link.name}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-300 inline-block group"
                  >
                    <span className="group-hover:translate-x-1 inline-block transition-transform duration-300">
                      {link.name}
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4"
        >
          <p className="text-gray-500 text-sm text-center sm:text-left">
            © {currentYear} HR Platform. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <span className="hidden sm:inline">Made with</span>
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              className="text-red-500"
            >
              ❤️
            </motion.span>
            <span className="hidden sm:inline">for HR professionals</span>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

