import React from 'react';
import { Map, Sparkles } from 'lucide-react';

export default function Footer() {
  const footerLinks = [
    { title: 'Sản phẩm', links: ['Tính năng', 'Lộ trình', 'Tích hợp API'] },
    { title: 'Cộng đồng', links: ['Blog cảm hứng', 'Nhật ký người dùng', 'Tham gia nhóm'] },
    { title: 'Hỗ trợ', links: ['Trung tâm trợ giúp', 'Chính sách bảo mật', 'Điều khoản sử dụng'] },
  ];

  return (
    <footer className="relative mt-12 bg-slate-950/60">
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-12 pt-16 sm:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.4fr,1fr,1fr,1fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-emerald-200">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/20 text-emerald-200">
                <Map className="h-6 w-6" />
              </div>
              <span className="text-xl font-semibold text-slate-100">MemoryMap</span>
            </div>
            <p className="max-w-sm text-sm text-slate-400">
              Một không gian riêng tư để bạn lưu giữ, phân tích và sống lại mọi khoảnh khắc. Thiết kế dành cho những người yêu hành trình và cảm xúc chân thật.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
              <Sparkles className="h-4 w-4" />
              Phiên bản 2025
            </div>
          </div>

          {footerLinks.map((section) => (
            <div key={section.title} className="space-y-3">
              <h5 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-200">{section.title}</h5>
              <ul className="space-y-2 text-sm text-slate-400">
                {section.links.map((link) => (
                  <li key={link}>
                    <a href="/#" className="transition-colors hover:text-emerald-200">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 pt-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MemoryMap. Thiết kế và phát triển cho những tâm hồn yêu dịch chuyển.</p>
          <div className="flex flex-wrap items-center gap-4">
            <a href="/#" className="transition-colors hover:text-emerald-200">Điều khoản</a>
            <a href="/#" className="transition-colors hover:text-emerald-200">Bảo mật</a>
            <a href="/#" className="transition-colors hover:text-emerald-200">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
